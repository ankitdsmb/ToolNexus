using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.OpenApi.Models;
using Serilog;
using ToolNexus.Api.Configuration;
using ToolNexus.Api.Diagnostics;
using ToolNexus.Api.Filters;
using ToolNexus.Api.Middleware;
using ToolNexus.Api.Logging;
using ToolNexus.Application;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure;
using ToolNexus.Infrastructure.Observability;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Logging.ToolNexus.json", optional: true, reloadOnChange: true);
FileLoggingBootstrapper.Configure(builder);

// Capture IMvcBuilder returned by AddControllers so we can call ConfigureApiBehaviorOptions on it.
var mvcBuilder = builder.Services.AddControllers(options =>
{
    options.Filters.AddService<RedactingLoggingExceptionFilter>();
});

mvcBuilder.ConfigureApiBehaviorOptions(options =>
{
    options.SuppressModelStateInvalidFilter = false;
});

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "ToolNexus API", Version = "v1" });
    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        BearerFormat = "JWT"
    });

    options.AddSecurityDefinition(CookieAuthenticationDefaults.AuthenticationScheme, new OpenApiSecurityScheme
    {
        Description = "Cookie authentication. Sign in through ToolNexus.Web to receive ToolNexus.Auth cookie.",
        Name = "ToolNexus.Auth",
        In = ParameterLocation.Cookie,
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
                    Id = JwtBearerDefaults.AuthenticationScheme
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
                    Id = CookieAuthenticationDefaults.AuthenticationScheme
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services
    .AddApplication(builder.Configuration)
    .AddInfrastructure(builder.Configuration)
    .AddCaching(builder.Configuration)
    .AddSecurity(builder.Configuration)
    .AddObservability(builder.Configuration)
    .AddRateLimiting(builder.Configuration)
    .AddApiCors(builder.Configuration);


builder.Services.AddIdentityCore<IdentityUser>(options =>
{
    options.User.RequireUniqueEmail = true;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<ToolNexus.Infrastructure.Data.ToolNexusIdentityDbContext>();

builder.Services.Configure<ToolNexusLoggingOptions>(builder.Configuration.GetSection(ToolNexusLoggingOptions.SectionName));
builder.Services.AddSingleton<IRuntimeClientLoggerService, RuntimeClientLoggerService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHostedService<EndpointDiagnosticsHostedService>();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseSerilogRequestLogging();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<CorrelationEnrichmentMiddleware>();
app.UseMiddleware<RequestResponseLoggingMiddleware>();
app.UseMiddleware<AdminApiLoggingMiddleware>();
app.UseMiddleware<ToolExecutionLoggingMiddleware>();
app.UseMiddleware<SecurityLoggingMiddleware>();
app.UseMiddleware<SanitizeErrorMiddleware>();
app.UseMiddleware<ExceptionLoggingMiddleware>();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/tools", out var remaining))
    {
        context.Request.Path = $"/api/v1/tools{remaining}";
    }

    await next();
});
app.UseRouting();
app.UseCors(ApiCorsOptions.PolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseMiddleware<ApiCacheHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapHealthChecks("/health");
app.MapGet("/", () => "ToolNexus API Running");
app.MapGet("/health/background", (BackgroundWorkerHealthState health, DatabaseInitializationState dbInitState, AuditGuardrailsMetrics auditMetrics, IConcurrencyObservability concurrencyObservability) =>
{
    var concurrency = concurrencyObservability.GetHealthSnapshot();
    return Results.Ok(new
{
    queueSize = health.QueueSize,
    workerActive = health.IsWorkerActive,
    lastProcessedTimestampUtc = health.LastProcessedUtc,
    audit = new
    {
        outboxBacklogDepth = auditMetrics.CurrentOutboxBacklogDepth,
        deadLetterOpenCount = auditMetrics.CurrentDeadLetterOpenCount
    },
    databaseInitialization = new
    {
        status = dbInitState.Status.ToString().ToLowerInvariant(),
        error = dbInitState.Error
    },
    concurrency = new
    {
        totalConflictsLast24h = concurrency.TotalConflictsLast24Hours,
        conflictTrend = concurrency.ConflictTrend,
        topConflictingResources = concurrency.TopConflictingResources,
        severityIndicators = concurrency.Alerts
    }
});
});
app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapPrometheusScrapingEndpoint("/metrics");
app.MapControllers().RequireRateLimiting("ip");

var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger(LoggingCategories.StartupLifecycleLogger);
startupLogger.LogInformation("ToolNexus API startup completed. Environment={EnvironmentName}", app.Environment.EnvironmentName);

app.Run();

public partial class Program;
