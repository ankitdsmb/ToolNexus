using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using Serilog;
using ToolNexus.Api.Configuration;
using ToolNexus.Api.Diagnostics;
using ToolNexus.Api.Filters;
using ToolNexus.Api.Middleware;
using ToolNexus.Application;
using ToolNexus.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, cfg) => cfg.ReadFrom.Configuration(context.Configuration));

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

builder.Services.AddHttpContextAccessor();
builder.Services.AddHostedService<EndpointDiagnosticsHostedService>();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseSerilogRequestLogging();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<CorrelationEnrichmentMiddleware>();
app.UseMiddleware<RequestResponseLoggingMiddleware>();
app.UseMiddleware<SanitizeErrorMiddleware>();
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
app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapPrometheusScrapingEndpoint("/metrics");
app.MapControllers().RequireRateLimiting("ip");

app.Run();

public partial class Program;
