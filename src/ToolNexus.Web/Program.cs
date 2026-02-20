using System.IO.Compression;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles;
using ToolNexus.Application;
using ToolNexus.Infrastructure;
using ToolNexus.Web.Options;
using ToolNexus.Web.Security;
using ToolNexus.Web.Services;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.Configure<InternalAuthOptions>(builder.Configuration.GetSection(InternalAuthOptions.SectionName));

builder.Services.AddApplication(builder.Configuration);
builder.Services.AddInfrastructure(builder.Configuration); // REQUIRED
builder.Services.AddSingleton<IInternalUserPrincipalFactory, InternalUserPrincipalFactory>();
builder.Services.AddSingleton<IAppVersionService, AppVersionService>();
builder.Services.AddSingleton<IToolManifestLoader, ToolManifestLoader>();
builder.Services.AddSingleton<IToolRegistryService, ToolRegistryService>();
builder.Services.AddSingleton<IToolViewResolver, ToolViewResolver>();

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

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
    {
        options.Cookie.Name = "ToolNexus.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.None;
        options.LoginPath = "/auth/login";
        options.AccessDeniedPath = "/auth/login";
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
    });

builder.Services.AddAuthorization();

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
app.UseResponseCompression();
app.UseCors();

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
app.UseAuthentication();
app.UseAuthorization();
app.UseOutputCache();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

public partial class Program;
