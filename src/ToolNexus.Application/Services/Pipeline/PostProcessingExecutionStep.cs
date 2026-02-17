using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class PostProcessingExecutionStep(ILogger<PostProcessingExecutionStep> logger) : IToolExecutionStep
{
    public int Order => 500;

    public Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (!context.Items.TryGetValue(ApiExecutionStep.ResponseContextKey, out var rawResponse) || rawResponse is not ToolExecutionResponse response)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Execution pipeline completed without a response."));
        }

        if (!response.Success)
        {
            logger.LogWarning("Execution failed for tool {ToolId} action {Action}. Error: {Error}", context.ToolId, context.Action, response.Error);
        }

        return Task.FromResult(response with
        {
            Output = response.Output ?? string.Empty
        });
    }
}
