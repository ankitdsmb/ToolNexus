namespace ToolNexus.Web.Monitoring;

public sealed class StructuredRequestLogger(ILogger<StructuredRequestLogger> logger) : IStructuredRequestLogger
{
    private const string CorrelationIdHeader = "X-Correlation-ID";

    public void Info(HttpContext context, string messageTemplate, params object?[] args)
    {
        using var scope = BeginRequestScope(context);
        logger.LogInformation(messageTemplate, args);
    }

    public void Warning(HttpContext context, string messageTemplate, params object?[] args)
    {
        using var scope = BeginRequestScope(context);
        logger.LogWarning(messageTemplate, args);
    }

    private IDisposable? BeginRequestScope(HttpContext context)
    {
        var correlationId = ResolveCorrelationId(context);
        return logger.BeginScope(new Dictionary<string, object?>
        {
            ["CorrelationId"] = correlationId,
            ["RequestPath"] = context.Request.Path.Value,
            ["RequestMethod"] = context.Request.Method,
            ["RequestId"] = context.TraceIdentifier
        });
    }

    private static string ResolveCorrelationId(HttpContext context)
    {
        if (context.Items.TryGetValue(CorrelationIdHeader, out var correlationId) && correlationId is string value && !string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        if (context.Request.Headers.TryGetValue(CorrelationIdHeader, out var headerValue) && !string.IsNullOrWhiteSpace(headerValue))
        {
            return headerValue.ToString();
        }

        return context.TraceIdentifier;
    }
}
