using System.IO.Compression;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using Serilog;
using Serilog.Events;
using ToolNexus.Api.Middleware;
using ToolNexus.Application;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Caching;
using ToolNexus.Infrastructure.Executors;
using ToolNexus.Infrastructure.HealthChecks;

var builder = WebApplication.CreateBuilder(args);
var maxRequestBodySizeBytes = 5 * 1024 * 1024;

/* =========================================================
   LOGGING (Serilog)
   ========================================================= */

builder.Host.UseSerilog((context, services, configuration) =>
{
    var enableConsoleJson = context.Configuration.GetValue(
        "Serilog:UseJsonConsole",
        !context.HostingEnvironment.IsDevelopment());

    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning);

    if (enableConsoleJson)
        configuration.WriteTo.Console(new Serilog.Formatting.Compact.RenderedCompactJsonFormatter());
    else
        configuration.WriteTo.Console();
});

/* =========================================================
   KESTREL CONFIGURATION
   ========================================================= */

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = maxRequestBodySizeBytes;
    options.ConfigureEndpointDefaults(endpoint =>
        endpoint.Protocols = Microsoft.AspNetCore.Server.Kestrel.Core.HttpProtocols.Http1AndHttp2);
});

/* =========================================================
   RESPONSE COMPRESSION
   ========================================================= */

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(o =>
    o.Level = CompressionLevel.Fastest);

builder.Services.Configure<GzipCompressionProviderOptions>(o =>
    o.Level = CompressionLevel.Fastest);

/* =========================================================
   FORM LIMIT
   ========================================================= */

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = maxRequestBodySizeBytes;
});

/* =========================================================
   MVC + PROBLEM DETAILS
   ========================================================= */

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();

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
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        },
        {
            new OpenApiSecurityScheme {
                Reference = new OpenApiReference {
                    Type = ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                }
            },
            Array.Empty<string>()
        }
    });
});

/* =========================================================
   RATE LIMITING
   ========================================================= */

var ipPerMinute = builder.Configuration.GetValue("RateLimiting:IpPerMinute", 120);
var userPerMinute = builder.Configuration.GetValue("RateLimiting:UserPerMinute", 240);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, token) =>
    {
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

/* =========================================================
   APPLICATION SERVICES
   ========================================================= */

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddToolExecutorsFromLoadedAssemblies();

builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();

var redisConnection =
    builder.Configuration.GetConnectionString("Redis") ??
    builder.Configuration["REDIS_CONNECTION_STRING"];

if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = builder.Configuration["REDIS_INSTANCE_NAME"] ?? "toolnexus";
    });
}

builder.Services.AddScoped<IToolResponseCache, RedisToolResultCache>();
builder.Services.AddScoped<IToolExecutionClient, ToolExecutionClient>();

/* =========================================================
   HEALTH CHECKS
   ========================================================= */

builder.Services.AddHealthChecks()
    .AddCheck("memory", () =>
    {
        var gcInfo = GC.GetGCMemoryInfo();
        var threshold = gcInfo.TotalAvailableMemoryBytes > 0
            ? gcInfo.TotalAvailableMemoryBytes * 0.90
            : long.MaxValue;

        var usage = GC.GetTotalMemory(false);

        return usage <= threshold
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy();
    }, tags: ["ready"])
    .AddCheck<DistributedCacheHealthCheck>("distributed-cache", tags: ["ready"]);

/* =========================================================
   BUILD APP
   ========================================================= */

var app = builder.Build();

/* =========================================================
   MIDDLEWARE PIPELINE
   ========================================================= */

app.UseResponseCompression();
app.UseSerilogRequestLogging();
app.UseMiddleware<RequestResponseLoggingMiddleware>();
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

app.UseRateLimiter();

app.MapHealthChecks("/health");
app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapControllers().RequireRateLimiting("ip");

app.Run();

public partial class Program;
