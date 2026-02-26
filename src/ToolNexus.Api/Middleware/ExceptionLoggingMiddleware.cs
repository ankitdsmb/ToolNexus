using ToolNexus.Api.Logging;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Middleware;

public sealed class ExceptionLoggingMiddleware(RequestDelegate next, ILoggerFactory loggerFactory)
{
    private readonly ILogger _logger = loggerFactory.CreateLogger(LoggingCategories.ExceptionLogger);

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (InputSanitizationException ex)
        {
            _logger.LogWarning(
                ex,
                "Input sanitization failed for request {Method} {Path}. CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                context.TraceIdentifier);

            throw;
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogWarning(
                    ex,
                    "Unhandled exception occurred after response started for request {Method} {Path}. CorrelationId: {CorrelationId}",
                    context.Request.Method,
                    context.Request.Path,
                    context.TraceIdentifier);

                throw;
            }

            _logger.LogError(
                ex,
                "Unhandled exception while processing request {Method} {Path}. CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                context.TraceIdentifier);

            throw;
        }
    }
}
