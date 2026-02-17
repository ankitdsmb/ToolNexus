using System.IO.Compression;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Serilog;
using Serilog.Events;
using ToolNexus.Api.Middleware;
using ToolNexus.Application;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Caching;
using ToolNexus.Infrastructure.HealthChecks;

var builder = WebApplication.CreateBuilder(args);
var maxRequestBodySizeBytes = 5 * 1024 * 1024;

builder.Host.UseSerilog((context, services, configuration) =>
{
    var enableConsoleJson = context.Configuration.GetValue("Serilog:UseJsonConsole", !context.HostingEnvironment.IsDevelopment());

    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning);

    if (enableConsoleJson)
    {
        configuration.WriteTo.Console(new Serilog.Formatting.Compact.RenderedCompactJsonFormatter());
    }
    else
    {
        configuration.WriteTo.Console();
    }
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = maxRequestBodySizeBytes;
    options.ConfigureEndpointDefaults(endpointOptions => endpointOptions.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1AndHttp2);
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = maxRequestBodySizeBytes;
});

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "ToolNexus API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Description = "API key header. Example: \"X-API-KEY: {key}\"",
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
var userPerMinute = builder.Configuration.GetValue("RateLimiting:UserPerMinute", 240);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"error\":\"Rate limit exceeded.\"}", token);
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

    options.AddPolicy("user", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            context.User.Identity?.IsAuthenticated == true
                ? context.User.Identity.Name ?? "authenticated"
                : "anonymous",
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = userPerMinute,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var userKey = context.User.Identity?.IsAuthenticated == true
            ? $"user:{context.User.Identity?.Name ?? "authenticated"}"
            : $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";

        return RateLimitPartition.GetTokenBucketLimiter(
            userKey,
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
builder.Services.AddToolExecutorsFromLoadedAssemblies();

builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();
var redisConnection = builder.Configuration.GetConnectionString("Redis") ?? builder.Configuration["REDIS_CONNECTION_STRING"];
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = builder.Configuration["REDIS_INSTANCE_NAME"] ?? "toolnexus";
    });
}

builder.Services.AddScoped<IToolResultCache, RedisToolResultCache>();
builder.Services.AddHealthChecks()
    .AddCheck("memory", () =>
    {
        var gcInfo = GC.GetGCMemoryInfo();
        var threshold = gcInfo.TotalAvailableMemoryBytes > 0 ? gcInfo.TotalAvailableMemoryBytes * 0.90 : long.MaxValue;
        var usage = GC.GetTotalMemory(forceFullCollection: false);

        return usage <= threshold
            ? HealthCheckResult.Healthy($"Memory usage within threshold. Current={usage}")
            : HealthCheckResult.Unhealthy($"Memory usage is above threshold. Current={usage} Threshold={threshold}");
    }, tags: ["ready"])
    .AddCheck<DistributedCacheHealthCheck>("distributed-cache", tags: ["ready"]);

var app = builder.Build();

app.UseResponseCompression();
app.UseSerilogRequestLogging();
app.UseMiddleware<RequestResponseLoggingMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseRateLimiter();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "ToolNexus API v1");
    options.DisplayRequestDuration();
});

app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => true
});

app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapControllers().RequireRateLimiting("ip");

app.Run();

public partial class Program;
