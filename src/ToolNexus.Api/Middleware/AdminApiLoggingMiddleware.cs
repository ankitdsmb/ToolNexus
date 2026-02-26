using System.Diagnostics;
using ToolNexus.Api.Logging;

namespace ToolNexus.Api.Middleware;

public sealed class AdminApiLoggingMiddleware(RequestDelegate next, ILoggerFactory loggerFactory)
{
    private readonly ILogger _logger = loggerFactory.CreateLogger(LoggingCategories.AdminApiLogger);

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/api/admin", StringComparison.OrdinalIgnoreCase))
        {
            await next(context);
            return;
        }

        var sw = Stopwatch.StartNew();
        await next(context);
        sw.Stop();

        _logger.LogInformation(
            "Admin API request completed {Method} {Path} -> {StatusCode} in {ElapsedMs}ms. CorrelationId: {CorrelationId}",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            sw.ElapsedMilliseconds,
            context.TraceIdentifier);
    }
}
