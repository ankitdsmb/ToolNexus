using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Middleware;

public sealed class ApiKeyValidationMiddleware(
    RequestDelegate next,
    IApiKeyValidator apiKeyValidator)
{
    private const string ApiKeyHeader = "X-API-KEY";

    public async Task InvokeAsync(HttpContext context)
    {
        if (!IsApiRequest(context.Request.Path))
        {
            await next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(ApiKeyHeader, out var apiKeyHeader) || apiKeyHeader.Count == 0)
        {
            await WriteProblem(context, StatusCodes.Status401Unauthorized, "API key is required.");
            return;
        }

        if (!apiKeyValidator.IsValid(apiKeyHeader[0].AsSpan()))
        {
            await WriteProblem(context, StatusCodes.Status401Unauthorized, "API key is invalid.");
            return;
        }

        await next(context);
    }

    private static bool IsApiRequest(PathString path)
    {
        return path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase);
    }

    private static Task WriteProblem(HttpContext context, int statusCode, string detail)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = "Unauthorized",
            Type = "https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.2",
            Detail = detail,
            Instance = context.Request.Path
        };

        return context.Response.WriteAsJsonAsync(problem);
    }
}
