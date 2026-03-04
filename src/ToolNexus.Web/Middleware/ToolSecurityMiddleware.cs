using System.Text.Json;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Middleware;

public sealed class ToolSecurityMiddleware(RequestDelegate next)
{
    private static readonly string[] ProtectedPrefixes =
    [
        "/api/tools/css"
    ];

    private static readonly string[] SuspiciousUserAgents =
    [
        "python-requests",
        "curl",
        "wget",
        "httpclient",
        "scrapy",
        "go-http-client",
        "bot",
        "crawler",
        "spider"
    ];

    public async Task InvokeAsync(
        HttpContext context,
        IBlockedIpService blockedIpService,
        IIpRateLimiter ipRateLimiter,
        IDomainScanLimiter domainScanLimiter,
        IPrivateNetworkValidator privateNetworkValidator,
        ILogger<ToolSecurityMiddleware> logger)
    {
        if (!IsProtectedRoute(context.Request.Path))
        {
            await next(context);
            return;
        }

        var userAgent = context.Request.Headers.UserAgent.ToString();
        if (IsSuspiciousUserAgent(userAgent))
        {
            await WriteViolation(context, StatusCodes.Status403Forbidden, "Suspicious user agent blocked.");
            return;
        }

        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
        if (blockedIpService.IsBlocked(ipAddress))
        {
            await WriteViolation(context, StatusCodes.Status403Forbidden, "IP address blocked.");
            return;
        }

        if (!ipRateLimiter.IsAllowed(ipAddress))
        {
            blockedIpService.Block(ipAddress, TimeSpan.FromMinutes(30), "IP rate limit exceeded");
            await WriteViolation(context, StatusCodes.Status429TooManyRequests, "IP scan rate exceeded. Maximum 5 scans per hour.");
            return;
        }

        if (RequiresTargetUrlValidation(context.Request))
        {
            var url = await ExtractScanUrlAsync(context.Request);
            if (string.IsNullOrWhiteSpace(url)
                || !Uri.TryCreate(url, UriKind.Absolute, out var parsedUri)
                || (parsedUri.Scheme != Uri.UriSchemeHttp && parsedUri.Scheme != Uri.UriSchemeHttps))
            {
                await WriteViolation(context, StatusCodes.Status403Forbidden, "Invalid scan URL.");
                return;
            }

            if (!domainScanLimiter.IsAllowed(parsedUri.Host))
            {
                await WriteViolation(context, StatusCodes.Status429TooManyRequests, "Domain scan limit exceeded. Maximum 5 scans per domain per hour.");
                return;
            }

            var safePublicUrl = await privateNetworkValidator.IsSafePublicUrlAsync(parsedUri.ToString(), context.RequestAborted);
            if (!safePublicUrl)
            {
                logger.LogWarning("Blocked private-network or unresolved target URL for Host={Host}", parsedUri.Host);
                await WriteViolation(context, StatusCodes.Status403Forbidden, "Target URL is not allowed.");
                return;
            }
        }

        await next(context);
    }

    private static bool IsProtectedRoute(PathString path)
    {
        var value = path.ToString();
        return ProtectedPrefixes.Any(prefix => value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
    }

    private static bool RequiresTargetUrlValidation(HttpRequest request)
        => HttpMethods.IsPost(request.Method)
           && request.Path.StartsWithSegments("/api/tools/css/analyze", StringComparison.OrdinalIgnoreCase);

    private static bool IsSuspiciousUserAgent(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return true;
        }

        return SuspiciousUserAgents.Any(pattern =>
            userAgent.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<string?> ExtractScanUrlAsync(HttpRequest request)
    {
        request.EnableBuffering();

        using var reader = new StreamReader(request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;

        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        if (root.TryGetProperty("url", out var urlValue))
        {
            return urlValue.GetString();
        }

        if (root.TryGetProperty("urlA", out var urlAValue))
        {
            return urlAValue.GetString();
        }

        return null;
    }

    private static async Task WriteViolation(HttpContext context, int statusCode, string error)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new { error });
        await context.Response.WriteAsync(payload);
    }
}
