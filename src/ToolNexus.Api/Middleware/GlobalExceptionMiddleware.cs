using Microsoft.AspNetCore.Mvc;

namespace ToolNexus.Api.Middleware;

public sealed class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception while processing request.");

            var problem = new ProblemDetails
            {
                Title = "An unexpected error occurred.",
                Detail = "The server encountered an unexpected condition.",
                Status = StatusCodes.Status500InternalServerError,
                Type = "https://httpstatuses.com/500",
                Instance = context.Request.Path
            };

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(problem);
        }
    }
}
