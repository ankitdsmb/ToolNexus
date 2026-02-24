namespace ToolNexus.Web.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string CorrelationIdHeader = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
    {
        var correlationId = context.Request.Headers.TryGetValue(CorrelationIdHeader, out var existing) && !string.IsNullOrWhiteSpace(existing)
            ? existing.ToString()
            : context.TraceIdentifier;

        context.Response.Headers[CorrelationIdHeader] = correlationId;
        context.Items[CorrelationIdHeader] = correlationId;

        using (logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["RequestId"] = context.TraceIdentifier
        }))
        {
            await next(context);
        }
    }
}
