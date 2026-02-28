using Microsoft.EntityFrameworkCore;
using System.IO.Compression;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles;
using ToolNexus.Application;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Observability;
using ToolNexus.Web.Areas.Admin.Services;
using ToolNexus.Infrastructure;
using ToolNexus.Web.Options;
using ToolNexus.Web.Security;
using ToolNexus.Web.Services;
using ToolNexus.Web.Middleware;
using ToolNexus.Web.Runtime;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Logging.ToolNexus.json", optional: true, reloadOnChange: true);

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
   OUTPUT CACHE
   ========================================================= */

builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(policy =>
        policy.Expire(TimeSpan.FromMinutes(5)));
});

/* =========================================================
   MVC + APPLICATION
   ========================================================= */

builder.Services.AddControllersWithViews();
builder.Services.Configure<ApiSettings>(builder.Configuration.GetSection(ApiSettings.SectionName));

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration); // REQUIRED
builder.Services.AddSingleton<IAppVersionService, AppVersionService>();
builder.Services.AddSingleton<IToolManifestLoader, ToolManifestLoader>();
builder.Services.AddSingleton<IToolRegistryService, ToolRegistryService>();
builder.Services.AddSingleton<IToolViewResolver, ToolViewResolver>();
builder.Services.AddSingleton<ClientLogEndpointContract>();
builder.Services.AddScoped<IAdminToolsViewModelService, AdminToolsViewModelService>();

var keyRingPath = builder.Configuration["DataProtection:KeyRingPath"];
if (!string.IsNullOrWhiteSpace(keyRingPath))
{
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(keyRingPath))
        .SetApplicationName("ToolNexus.SharedAuth");
}
else
{
    builder.Services.AddDataProtection().SetApplicationName("ToolNexus.SharedAuth");
}

builder.Services
    .AddIdentity<IdentityUser, IdentityRole>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequiredLength = 10;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ToolNexus.Infrastructure.Data.ToolNexusIdentityDbContext>()
    .AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "ToolNexus.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.LoginPath = "/auth/login";
    options.AccessDeniedPath = "/auth/access-denied";
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AdminPolicyNames.AdminRead, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context => AdminPermissionClaims.CanRead(context.User) || context.User.IsInRole("Admin"));
    });

    options.AddPolicy(AdminPolicyNames.AdminWrite, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context => AdminPermissionClaims.CanWrite(context.User) || context.User.IsInRole("Admin"));
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("https://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

/* =========================================================
   ERROR HANDLING
   ========================================================= */

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

if (app.Environment.IsProduction())
{
    app.UseResponseCompression();
}

/* =========================================================
   STATIC FILES (Precompressed Support)
   ========================================================= */

if (!app.Environment.IsDevelopment())
{
    var contentTypeProvider = new FileExtensionContentTypeProvider();

    app.Use(async (context, next) =>
    {
        if (!HttpMethods.IsGet(context.Request.Method) &&
            !HttpMethods.IsHead(context.Request.Method))
        {
            await next();
            return;
        }

        if (!context.Request.Path.HasValue)
        {
            await next();
            return;
        }

        var requestPath = context.Request.Path.Value!;

        if (requestPath.EndsWith(".br", StringComparison.OrdinalIgnoreCase) ||
            requestPath.EndsWith(".gz", StringComparison.OrdinalIgnoreCase))
        {
            await next();
            return;
        }

        var acceptedEncodings = context.Request.Headers.AcceptEncoding.ToString();

        if (string.IsNullOrWhiteSpace(acceptedEncodings))
        {
            await next();
            return;
        }

        var relativePath = requestPath.TrimStart('/');
        var fileProvider = app.Environment.WebRootFileProvider;

        var prefersBrotli = acceptedEncodings.Contains("br", StringComparison.OrdinalIgnoreCase);
        var acceptsGzip = acceptedEncodings.Contains("gzip", StringComparison.OrdinalIgnoreCase);

        if (prefersBrotli && fileProvider.GetFileInfo($"{relativePath}.br").Exists)
        {
            context.Request.Path = new PathString($"{requestPath}.br");
            context.Response.Headers.ContentEncoding = "br";
            context.Response.Headers.Vary = "Accept-Encoding";
            context.Items["StaticOriginalPath"] = requestPath;
        }
        else if (acceptsGzip && fileProvider.GetFileInfo($"{relativePath}.gz").Exists)
        {
            context.Request.Path = new PathString($"{requestPath}.gz");
            context.Response.Headers.ContentEncoding = "gzip";
            context.Response.Headers.Vary = "Accept-Encoding";
            context.Items["StaticOriginalPath"] = requestPath;
        }

        await next();
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = context =>
        {
            var headers = context.Context.Response.Headers;
            headers.CacheControl = "public,max-age=31536000,immutable";

            if (context.Context.Items.TryGetValue("StaticOriginalPath", out var originalPathObj) &&
                originalPathObj is string originalPath &&
                contentTypeProvider.TryGetContentType(originalPath, out var originalContentType))
            {
                context.Context.Response.ContentType = originalContentType;
            }
        }
    });
}
else
{
    app.UseStaticFiles();
}

/* =========================================================
   ROUTING
   ========================================================= */

app.UseRouting();
app.UseCors();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseOutputCache();

if (app.Environment.IsDevelopment())
{
    app.MapGet("/internal/runtime-diagnostics-contract", () => Results.Json(new
    {
        schemaVersion = "v1",
        dashboardContract = new[]
        {
            new
            {
                toolSlug = "string",
                mountStatus = "success|failed|fallback",
                modeUsed = "modern|legacy|fallback",
                timingData = new
                {
                    mountDurationMs = "number",
                    initializationDurationMs = "number",
                    dependencyLoadMs = "number"
                },
                errorCategory = "dom_contract_issue|lifecycle_error|dependency_failure|manifest_missing|unknown_runtime_exception"
            }
        },
        source = "window.ToolNexus.runtime.getObservabilitySnapshot()"
    }));
}

app.MapGet("/api/admin/debug/tools-count", async (ToolNexus.Infrastructure.Data.ToolNexusContentDbContext dbContext, CancellationToken cancellationToken) =>
{
    string provider = dbContext.Database.IsSqlite()
        ? "Sqlite"
        : dbContext.Database.IsNpgsql()
            ? "PostgreSQL"
            : dbContext.Database.ProviderName ?? "Unknown";

    var result = new
    {
        provider,
        toolsCount = await dbContext.ToolDefinitions.CountAsync(cancellationToken),
        contentsCount = await dbContext.ToolContents.CountAsync(cancellationToken),
        policiesCount = await dbContext.ToolExecutionPolicies.CountAsync(cancellationToken)
    };

    return Results.Ok(result);
});

app.MapGet("/health/runtime", (DatabaseInitializationState dbInitState) =>
{
    var dbConnected = dbInitState.IsReady;
    return Results.Ok(new
    {
        db_connected = dbConnected,
        execution_ready = dbConnected
    });
});

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

app.MapControllers();

app.MapControllerRoute(
    name: "admin",
    pattern: "admin/{controller=Dashboard}/{action=Index}/{id?}",
    defaults: new { area = "Admin" });

app.MapControllerRoute(
    name: "areas",
    pattern: "{area:exists}/{controller=Home}/{action=Index}/{id?}");

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Services.GetRequiredService<ClientLogEndpointContract>().ResolveRoutableEndpointOrNull();

app.Run();

public partial class Program;
