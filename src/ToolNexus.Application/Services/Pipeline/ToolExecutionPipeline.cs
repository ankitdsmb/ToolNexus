using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ToolExecutionPipeline(IEnumerable<IToolExecutionStep> steps) : IToolExecutionPipeline
{
    private readonly IReadOnlyList<IToolExecutionStep> _steps = steps
        .OrderBy(step => step.Order)
        .ToArray();

    public Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default)
    {
        var context = new ToolExecutionContext(toolId, action, input);
        return ExecuteStepAsync(0, context, cancellationToken);
    }

    private Task<ToolExecutionResponse> ExecuteStepAsync(int index, ToolExecutionContext context, CancellationToken cancellationToken)
    {
        if (index >= _steps.Count)
        {
            return Task.FromResult(new ToolExecutionResponse(false, string.Empty, "No execution handler could process the request."));
        }

        return _steps[index].InvokeAsync(context, (ctx, ct) => ExecuteStepAsync(index + 1, ctx, ct), cancellationToken);
    }
}
