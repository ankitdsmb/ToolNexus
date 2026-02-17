using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class ExecutionStep(IApiToolExecutionStrategy strategy) : IToolExecutionStep
{
    public int Order => 500;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (context.Response is null)
        {
            context.Response = await strategy.ExecuteAsync(context.ToolId, context.Action, context.Input, context.Policy, cancellationToken);
        }

        return await next(context, cancellationToken);
    }
}
