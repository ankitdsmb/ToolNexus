using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using StackExchange.Redis;
using System.Threading.RateLimiting;
using ToolNexus.Api.Options;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Infrastructure.HealthChecks;
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
        services.AddOptions<SecurityHeadersOptions>().Bind(configuration.GetSection(SecurityHeadersOptions.SectionName)).ValidateOnStart();
        return services;
    }

    public static IServiceCollection AddObservability(this IServiceCollection services)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(r => r.AddService("ToolNexus.Api"))
            .WithMetrics(metrics =>
            {
                metrics.AddAspNetCoreInstrumentation();
                metrics.AddHttpClientInstrumentation();
                metrics.AddMeter(ToolExecutionMetrics.MeterName);
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
}
