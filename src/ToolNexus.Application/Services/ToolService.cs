using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application.Services;

public sealed class ToolService(
    IToolExecutionPipeline executionPipeline,
    ILogger<ToolService> logger) : IToolService
{
    public async Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            logger.LogWarning("Tool execution request was null.");
            return new ToolExecutionResponse(false, string.Empty, "Request is required.");
        }

        try
        {
            return await executionPipeline.ExecuteAsync(request.Slug, request.Action, request.Input, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled tool execution pipeline error for tool {Slug} action {Action}.", request.Slug, request.Action);
            return new ToolExecutionResponse(false, string.Empty, "Tool execution failed unexpectedly.");
        }
    }
}
