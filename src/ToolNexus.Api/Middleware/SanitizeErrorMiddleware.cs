using ToolNexus.Application.Services;

namespace ToolNexus.Api.Middleware;

/// <summary>
/// Converts unhandled exceptions into a stable error contract that never leaks internal details.
/// </summary>
public sealed class SanitizeErrorMiddleware(RequestDelegate next, ILogger<SanitizeErrorMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (InputSanitizationException ex)
        {
            logger.LogWarning(
                "Input sanitization failed for request {Method} {Path}. CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                context.TraceIdentifier);

            await WriteErrorAsync(
                context,
                StatusCodes.Status400BadRequest,
                "invalid_input",
                ex.Message);
        }
        catch (Exception)
        {
            logger.LogError(
                "Unhandled exception while processing request {Method} {Path}. CorrelationId: {CorrelationId}",
                context.Request.Method,
                context.Request.Path,
                context.TraceIdentifier);

            await WriteErrorAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "internal_error",
                "An unexpected error occurred.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string code, string message)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(new ApiErrorResponse(
            Code: code,
            Message: message,
            CorrelationId: context.TraceIdentifier));
    }

    public sealed record ApiErrorResponse(string Code, string Message, string CorrelationId);
}
