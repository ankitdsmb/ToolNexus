using System.Diagnostics;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Middleware;

public sealed class RequestResponseLoggingMiddleware(
    RequestDelegate next,
    ILogger<RequestResponseLoggingMiddleware> logger,
    ILogRedactionPolicy redactionPolicy)
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
            var safeQuery = context.Request.Query.ToDictionary(
                kvp => kvp.Key,
                kvp => redactionPolicy.Redact(kvp.Key, kvp.Value.ToString()),
                StringComparer.OrdinalIgnoreCase);

            logger.LogInformation(
                "HTTP transaction completed {@HttpLog}",
                new
                {
                    method = context.Request.Method,
                    path = context.Request.Path.ToString(),
                    query = safeQuery,
                    statusCode = context.Response.StatusCode,
                    elapsedMilliseconds = sw.Elapsed.TotalMilliseconds,
                    traceId = context.TraceIdentifier
                });
        }
    }
}
