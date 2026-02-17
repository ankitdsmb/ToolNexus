using System.Diagnostics;

namespace ToolNexus.Api.Middleware;

public sealed class RequestResponseLoggingMiddleware(RequestDelegate next, ILogger<RequestResponseLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();

        try
        {
            await next(context);
        }
        finally
        {
            sw.Stop();
            logger.LogInformation(
                "HTTP transaction completed {@HttpLog}",
                new
                {
                    method = context.Request.Method,
                    path = context.Request.Path.ToString(),
                    statusCode = context.Response.StatusCode,
                    elapsedMilliseconds = sw.Elapsed.TotalMilliseconds,
                    traceId = context.TraceIdentifier
                });
        }
    }
}
