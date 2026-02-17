using Microsoft.AspNetCore.Mvc.Filters;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Filters;

/// <summary>
/// Logs request metadata for unhandled MVC exceptions while redacting configured sensitive fields.
/// </summary>
public sealed class RedactingLoggingExceptionFilter(
    ILogger<RedactingLoggingExceptionFilter> logger,
    ILogRedactionPolicy redactionPolicy) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var request = context.HttpContext.Request;

        var safeQuery = request.Query.ToDictionary(
            kvp => kvp.Key,
            kvp => redactionPolicy.Redact(kvp.Key, kvp.Value.ToString()),
            StringComparer.OrdinalIgnoreCase);

        logger.LogError(
            "Unhandled MVC exception captured. {Method} {Path} CorrelationId: {CorrelationId} Query: {@SafeQuery}",
            request.Method,
            request.Path,
            context.HttpContext.TraceIdentifier,
            safeQuery);
    }
}
