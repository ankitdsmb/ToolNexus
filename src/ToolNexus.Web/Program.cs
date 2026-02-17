using System.IO.Compression;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles;
using ToolNexus.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
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

builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(policyBuilder => policyBuilder.Expire(TimeSpan.FromMinutes(5)));
});

builder.Services.AddControllersWithViews();
builder.Services.AddSingleton<IManifestService, ManifestService>();
builder.Services.AddSingleton<ISitemapService, SitemapService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseResponseCompression();

if (!app.Environment.IsDevelopment())
{
    var contentTypeProvider = new FileExtensionContentTypeProvider();

    app.Use(async (context, next) =>
    {
        if ((HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)) &&
            !string.IsNullOrEmpty(context.Request.Path.Value) &&
            !Path.HasExtension(context.Request.Path.Value))
        {
            await next();
            return;
        }

        if ((HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)) &&
            context.Request.Path.HasValue)
        {
            var requestPath = context.Request.Path.Value!;

            if (!requestPath.EndsWith(".br", StringComparison.OrdinalIgnoreCase) &&
                !requestPath.EndsWith(".gz", StringComparison.OrdinalIgnoreCase))
            {
                var relativePath = requestPath.TrimStart('/');
                var acceptedEncodings = context.Request.Headers.AcceptEncoding.ToString();

                if (!string.IsNullOrEmpty(acceptedEncodings))
                {
                    var prefersBrotli = acceptedEncodings.Contains("br", StringComparison.OrdinalIgnoreCase);
                    var acceptsGzip = acceptedEncodings.Contains("gzip", StringComparison.OrdinalIgnoreCase);

                    if (prefersBrotli && app.Environment.WebRootFileProvider.GetFileInfo($"{relativePath}.br").Exists)
                    {
                        context.Request.Path = new PathString($"{requestPath}.br");
                        context.Response.Headers.ContentEncoding = "br";
                        context.Response.Headers.Vary = "Accept-Encoding";
                        context.Items["StaticOriginalPath"] = requestPath;
                    }
                    else if (acceptsGzip && app.Environment.WebRootFileProvider.GetFileInfo($"{relativePath}.gz").Exists)
                    {
                        context.Request.Path = new PathString($"{requestPath}.gz");
                        context.Response.Headers.ContentEncoding = "gzip";
                        context.Response.Headers.Vary = "Accept-Encoding";
                        context.Items["StaticOriginalPath"] = requestPath;
                    }
                }
            }
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

app.UseRouting();
app.UseOutputCache();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
