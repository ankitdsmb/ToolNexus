using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ValidationExecutionStep : IToolExecutionStep
{
    public int Order => 100;

    public Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(context.ToolId))
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Tool slug is required."));
        }

        if (string.IsNullOrWhiteSpace(context.Action))
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Action is required."));
        }

        if (context.Input is null)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "Input is required."));
        }

        return next(context, cancellationToken);
    }
}
