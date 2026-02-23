using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using StackExchange.Redis;
using System.Threading.RateLimiting;
using ToolNexus.Api.Authentication;
using ToolNexus.Api.Filters;
using ToolNexus.Api.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Infrastructure.HealthChecks;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Observability;
using ToolNexus.Infrastructure.Security;

namespace ToolNexus.Api.Configuration;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCaching(this IServiceCollection services, IConfiguration configuration)
    {
        var memorySizeLimit = configuration.GetValue<long?>("Caching:Memory:SizeLimit") ?? 2048;
        if (memorySizeLimit <= 0)
        {
            throw new InvalidOperationException("Caching:Memory:SizeLimit must be a positive value.");
        }

        services.AddMemoryCache(options => options.SizeLimit = memorySizeLimit);
        services.AddOptions<MemoryCacheOptions>().Configure(options => options.SizeLimit ??= memorySizeLimit);
        services.AddDistributedMemoryCache();

        var redisConnectionString = configuration.GetConnectionString("Redis") ?? configuration["REDIS_CONNECTION_STRING"];
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
            redisOptions.AbortOnConnectFail = false;
            services.AddStackExchangeRedisCache(options => options.ConfigurationOptions = redisOptions);
        }

        return services;
    }

    public static IServiceCollection AddSecurity(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IApiKeyValidator, ApiKeyValidator>();
        services.AddSingleton<ILogRedactionPolicy, LogRedactionPolicy>();
        services.AddScoped<RedactingLoggingExceptionFilter>();

        var jwtOptions = configuration.GetSection(JwtSecurityOptions.SectionName).Get<JwtSecurityOptions>()
            ?? new JwtSecurityOptions();

        var signingKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtOptions.SigningKey));


        var keyRingPath = configuration["DataProtection:KeyRingPath"];
        if (!string.IsNullOrWhiteSpace(keyRingPath))
        {
            services.AddDataProtection()
                .PersistKeysToFileSystem(new DirectoryInfo(keyRingPath))
                .SetApplicationName("ToolNexus.SharedAuth");
        }
        else
        {
            services.AddDataProtection().SetApplicationName("ToolNexus.SharedAuth");
        }

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = "toolnexus-smart";
                options.DefaultChallengeScheme = "toolnexus-smart";
            })
            .AddPolicyScheme("toolnexus-smart", "JWT or Cookie", options =>
            {
                options.ForwardDefaultSelector = context =>
                {
                    var authHeader = context.Request.Headers.Authorization.ToString();
                    return authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                        ? JwtBearerDefaults.AuthenticationScheme
                        : CookieAuthenticationDefaults.AuthenticationScheme;
                };
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = true;
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("AuthDiagnostics");
                        logger.LogInformation("Authenticated request using {Scheme} scheme.", JwtBearerDefaults.AuthenticationScheme);
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("AuthDiagnostics");
                        logger.LogWarning(context.Exception, "JWT authentication failed.");
                        return Task.CompletedTask;
                    }
                };
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = signingKey,
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
            })
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
            {
                options.Cookie.Name = "ToolNexus.Auth";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.None;
                options.SlidingExpiration = true;
                options.ExpireTimeSpan = TimeSpan.FromHours(8);
                options.Events = new CookieAuthenticationEvents
                {
                    OnValidatePrincipal = context =>
                    {
                        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("AuthDiagnostics");
                        logger.LogInformation("Authenticated request using {Scheme} scheme.", CookieAuthenticationDefaults.AuthenticationScheme);
                        return Task.CompletedTask;
                    },
                    OnRedirectToLogin = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        return Task.CompletedTask;
                    },
                    OnRedirectToAccessDenied = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(AdminPolicyNames.AdminRead, policy =>
            {
                policy.AddAuthenticationSchemes(
                    JwtBearerDefaults.AuthenticationScheme,
                    CookieAuthenticationDefaults.AuthenticationScheme);
                policy.RequireAuthenticatedUser();
                policy.RequireAssertion(context => AdminPermissionClaims.CanRead(context.User));
            });

            options.AddPolicy(AdminPolicyNames.AdminWrite, policy =>
            {
                policy.AddAuthenticationSchemes(
                    JwtBearerDefaults.AuthenticationScheme,
                    CookieAuthenticationDefaults.AuthenticationScheme);
                policy.RequireAuthenticatedUser();
                policy.RequireAssertion(context => AdminPermissionClaims.CanWrite(context.User));
            });

            options.AddPolicy(ToolActionRequirement.PolicyName, policy =>
            {
                policy.AddAuthenticationSchemes(
                    JwtBearerDefaults.AuthenticationScheme,
                    CookieAuthenticationDefaults.AuthenticationScheme);
                policy.RequireAuthenticatedUser();
                policy.AddRequirements(new ToolActionRequirement());
            });
        });

        services.AddSingleton<IAuthorizationHandler, ToolActionAuthorizationHandler>();
        services.AddOptions<JwtSecurityOptions>().Bind(configuration.GetSection(JwtSecurityOptions.SectionName)).ValidateOnStart();
        services.AddOptions<SecurityHeadersOptions>().Bind(configuration.GetSection(SecurityHeadersOptions.SectionName)).ValidateOnStart();
        return services;
    }

    public static IServiceCollection AddObservability(this IServiceCollection services, IConfiguration configuration)
    {
        var serviceName = configuration.GetValue<string>("OpenTelemetry:ServiceName") ?? "ToolNexus.Api";

        services.AddOpenTelemetry()
            .ConfigureResource(r => r.AddService(serviceName))
            .WithMetrics(metrics =>
            {
                metrics.AddAspNetCoreInstrumentation();
                metrics.AddHttpClientInstrumentation();
                metrics.AddMeter(ToolExecutionMetrics.MeterName);
                metrics.AddMeter(AuditGuardrailsMetrics.MeterName);
                metrics.AddMeter(ConcurrencyObservability.MeterName);
                metrics.AddView("tool_latency_ms", new ExplicitBucketHistogramConfiguration
                {
                    Boundaries =
                    [
                        5, 10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 5000
                    ]
                });
                metrics.AddPrometheusExporter();
            });

        services.AddSingleton<IHealthCheckPublisher, HealthStateLoggingPublisher>();
        services.Configure<HealthCheckPublisherOptions>(options =>
        {
            options.Delay = TimeSpan.FromSeconds(2);
            options.Period = TimeSpan.FromSeconds(30);
        });

        services.AddHealthChecks()
            .AddCheck("process", () => HealthCheckResult.Healthy("Process running."), tags: ["live"])
            .AddCheck("application-services", () => HealthCheckResult.Healthy("Application services available."), tags: ["ready"])
            .AddCheck<DatabaseInitializationHealthCheck>("database-initialization", tags: ["ready"])
            .AddCheck<DistributedCacheHealthCheck>("redis", tags: ["ready"]);

        return services;
    }

    public static IServiceCollection AddRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var ipPerMinute = configuration.GetValue("RateLimiting:IpPerMinute", 120);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, token) =>
            {
                context.HttpContext.Response.ContentType = "application/problem+json";
                await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = 429,
                    Title = "Too many requests.",
                    Detail = "Rate limit exceeded."
                }, cancellationToken: token);
            };

            options.AddPolicy("ip", httpContext =>
                RateLimitPartition.GetTokenBucketLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new TokenBucketRateLimiterOptions
                    {
                        TokenLimit = ipPerMinute,
                        TokensPerPeriod = ipPerMinute,
                        ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true
                    }));
        });

        return services;
    }

    public static IServiceCollection AddApiCors(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetSection(ApiCorsOptions.SectionName).Get<ApiCorsOptions>() ?? new ApiCorsOptions();
        if (options.AllowedOrigins.Length == 0)
        {
            throw new InvalidOperationException("Cors:AllowedOrigins must contain at least one origin.");
        }

        services.AddCors(cors =>
        {
            cors.AddPolicy(ApiCorsOptions.PolicyName, policy =>
            {
                policy.WithOrigins(options.AllowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        return services;
    }

}
