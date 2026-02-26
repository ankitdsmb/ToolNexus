using ToolNexus.Api.Logging;

namespace ToolNexus.Api.Middleware;

public sealed class SecurityLoggingMiddleware(RequestDelegate next, ILoggerFactory loggerFactory)
{
    private readonly ILogger _logger = loggerFactory.CreateLogger(LoggingCategories.SecurityLogger);

    public async Task InvokeAsync(HttpContext context)
    {
        await next(context);

        if (context.Response.StatusCode is not (StatusCodes.Status401Unauthorized or StatusCodes.Status403Forbidden))
        {
            return;
        }

        _logger.LogWarning(
            "Security response emitted {Method} {Path} -> {StatusCode}. CorrelationId: {CorrelationId}",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            context.TraceIdentifier);
    }
}
