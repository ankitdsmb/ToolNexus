using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;
using StackExchange.Redis;
using System.IO.Compression;
using System.Reflection;
using System.Threading.RateLimiting;
using ToolNexus.Api;
using ToolNexus.Api.Middleware;
using ToolNexus.Api.Options;
using ToolNexus.Application;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure;
using ToolNexus.Infrastructure.Caching;
using ToolNexus.Infrastructure.Executors;
using ToolNexus.Infrastructure.HealthChecks;
using ToolNexus.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);
var maxRequestBodySizeBytes = 5 * 1024 * 1024;

builder.Host.UseSerilog((context, services, configuration) =>
{
    var environmentName = context.HostingEnvironment.EnvironmentName;
    var appVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown";
    var enableConsoleJson = context.Configuration.GetValue("Serilog:UseJsonConsole", !context.HostingEnvironment.IsDevelopment());

    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("Environment", environmentName)
        .Enrich.WithProperty("ApplicationVersion", appVersion)
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning);

    if (enableConsoleJson)
    {
        configuration.WriteTo.Async(sink => sink.Console(new RenderedCompactJsonFormatter()));
    }
    else
    {
        configuration.WriteTo.Async(sink => sink.Console());
    }
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = maxRequestBodySizeBytes;
    options.ConfigureEndpointDefaults(endpoint =>
        endpoint.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1AndHttp2);
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = maxRequestBodySizeBytes;
});

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();

/* =========================================================
   HTTPS + HSTS
   ========================================================= */

builder.Services.AddHttpsRedirection(options =>
{
    options.RedirectStatusCode = StatusCodes.Status307TemporaryRedirect;
    options.HttpsPort = builder.Configuration.GetValue<int?>("Security:HttpsRedirection:HttpsPort");
});

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});

builder.Services
    .AddOptions<SecurityHeadersOptions>()
    .Bind(builder.Configuration.GetSection(SecurityHeadersOptions.SectionName))
    .ValidateOnStart();

/* =========================================================
   SWAGGER
   ========================================================= */

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ToolNexus API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Description = "API key header.",
        Name = "X-API-KEY",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        },
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                }
            },
            Array.Empty<string>()
        }
    });
});

var ipPerMinute = builder.Configuration.GetValue("RateLimiting:IpPerMinute", 120);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, token) =>
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("RateLimiting");
        logger.LogWarning("Rate limit rejection for path {Path} ip {IpAddress}.",
            context.HttpContext.Request.Path,
            context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        context.HttpContext.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = 429,
            Title = "Too many requests.",
            Detail = "Rate limit exceeded.",
            Type = "https://httpstatuses.com/429",
            Instance = context.HttpContext.Request.Path
        };

        await context.HttpContext.Response.WriteAsJsonAsync(problem, cancellationToken: token);
    };

    options.AddPolicy("ip", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = ipPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetTokenBucketLimiter(
            key,
            _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = 200,
                TokensPerPeriod = 100,
                ReplenishmentPeriod = TimeSpan.FromSeconds(30),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure();
builder.Services.AddToolExecutorsFromLoadedAssemblies();
builder.Services.AddScoped<IApiKeyValidator, ApiKeyValidator>();

builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();

var redisConnectionString =
    builder.Configuration.GetConnectionString("Redis") ??
    builder.Configuration["REDIS_CONNECTION_STRING"];

IConnectionMultiplexer? redisMultiplexer = null;

if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
    redisOptions.AbortOnConnectFail = false;
    redisOptions.ConnectRetry = 5;
    redisOptions.ConnectTimeout = 5000;
    redisOptions.SyncTimeout = 5000;
    redisOptions.Ssl = builder.Configuration.GetValue("Redis:Ssl", redisOptions.Ssl);

    var redisPassword = builder.Configuration["Redis:Password"];
    if (!string.IsNullOrWhiteSpace(redisPassword))
    {
        redisOptions.Password = redisPassword;
    }

    var redisInstanceName =
        builder.Configuration["Redis:InstanceName"] ??
        builder.Configuration["REDIS_INSTANCE_NAME"] ??
        "toolnexus";

    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.ConfigurationOptions = redisOptions;
        options.InstanceName = redisInstanceName;
    });

    try
    {
        redisMultiplexer = await ConnectionMultiplexer.ConnectAsync(redisOptions);
    }
    catch
    {
        redisMultiplexer = null;
    }
}

builder.Services.AddScoped<IToolResultCache, RedisToolResultCache>();
builder.Services.AddScoped<IToolExecutionClient, ToolExecutionClient>();

builder.Services.AddSingleton<IHealthCheckPublisher, HealthStateLoggingPublisher>();
builder.Services.Configure<HealthCheckPublisherOptions>(options =>
{
    options.Delay = TimeSpan.FromSeconds(2);
    options.Period = TimeSpan.FromSeconds(30);
});

builder.Services.AddHealthChecks()
    .AddCheck("process", () => HealthCheckResult.Healthy("Process running."), tags: ["live"])
    .AddCheck("memory", () =>
    {
        var gcInfo = GC.GetGCMemoryInfo();
        var threshold = gcInfo.TotalAvailableMemoryBytes > 0
            ? gcInfo.TotalAvailableMemoryBytes * 0.90
            : long.MaxValue;

        var usage = GC.GetTotalMemory(false);

        return usage <= threshold
            ? HealthCheckResult.Healthy("Memory usage within threshold.")
            : HealthCheckResult.Unhealthy("Memory usage exceeds threshold.");
    }, tags: ["ready"])
    .AddCheck("application-services", () => HealthCheckResult.Healthy("Application services available."), tags: ["ready"])
    .AddCheck<DistributedCacheHealthCheck>("redis", tags: ["ready"]);

var app = builder.Build();

/* =========================================================
   MIDDLEWARE PIPELINE
   ========================================================= */

app.UseHttpsRedirection();

if (app.Environment.IsProduction())
{
    app.UseHsts();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseResponseCompression();
app.UseSerilogRequestLogging();
app.UseMiddleware<CorrelationEnrichmentMiddleware>();
app.UseMiddleware<RequestResponseLoggingMiddleware>();
app.UseMiddleware<ApiKeyValidationMiddleware>();
app.UseRateLimiter();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<ApiCacheHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(o =>
    {
        o.RoutePrefix = "swagger";
        o.SwaggerEndpoint("/swagger/v1/swagger.json", "ToolNexus API v1");
        o.DisplayRequestDuration();
    });
}

app.MapHealthChecks("/health");
app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapControllers().RequireRateLimiting("ip");

using (var scope = app.Services.CreateScope())
{
    var startupLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    var healthCheckService = scope.ServiceProvider.GetRequiredService<HealthCheckService>();
    var startupHealth = await healthCheckService.CheckHealthAsync();
    startupLogger.LogInformation("Startup health status {HealthStatus}", startupHealth.Status);
}

app.Run();

public partial class Program;
