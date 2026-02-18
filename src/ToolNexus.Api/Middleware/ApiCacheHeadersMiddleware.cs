using System.Security.Cryptography;
using System.Text;

namespace ToolNexus.Api.Middleware;

public sealed class ApiCacheHeadersMiddleware(RequestDelegate next)
{
    private const string NoStore = "no-store";
    private const string PublicMetadataCache = "public,max-age=600";

    public Task InvokeAsync(HttpContext context)
    {
        var isApiRequest = context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);

        if (!isApiRequest)
        {
            return next(context);
        }

        context.Response.OnStarting(() =>
        {
            if (context.Response.StatusCode >= 400)
            {
                context.Response.Headers.CacheControl = NoStore;
                context.Response.Headers.Remove("ETag");
                return Task.CompletedTask;
            }

            var isPost = HttpMethods.IsPost(context.Request.Method);
            var isToolResultEndpoint = context.Request.Path.StartsWithSegments("/api/v1/tools", StringComparison.OrdinalIgnoreCase) ||
                                       context.Request.Path.StartsWithSegments("/api/tools", StringComparison.OrdinalIgnoreCase);

            if (isPost || isToolResultEndpoint)
            {
                context.Response.Headers.CacheControl = NoStore;
                context.Response.Headers.Remove("ETag");
                return Task.CompletedTask;
            }

            if (HttpMethods.IsGet(context.Request.Method) &&
                context.Request.Path.Value?.Contains("metadata", StringComparison.OrdinalIgnoreCase) is true)
            {
                var eTag = BuildMetadataETag(context);
                context.Response.Headers.CacheControl = PublicMetadataCache;
                context.Response.Headers.ETag = eTag;

                if (context.Request.Headers.IfNoneMatch.Any(v => string.Equals(v, eTag, StringComparison.Ordinal)))
                {
                    context.Response.StatusCode = StatusCodes.Status304NotModified;
                    context.Response.ContentLength = 0;
                }

                return Task.CompletedTask;
            }

            context.Response.Headers.CacheControl = NoStore;
            return Task.CompletedTask;
        });

        return next(context);
    }

    private static string BuildMetadataETag(HttpContext context)
    {
        var source = string.Concat(context.Request.Path.Value, "?", context.Request.QueryString.Value);
        Span<byte> hash = stackalloc byte[32];
        SHA256.HashData(Encoding.UTF8.GetBytes(source), hash);
        return $"W/\"{Convert.ToHexString(hash)}\"";
    }
}
