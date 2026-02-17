using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ApiExecutionStep(IApiToolExecutionStrategy strategy) : IToolExecutionStep
{
    public const string ResponseContextKey = "pipeline.execution-response";

    public int Order => 400;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (!context.Items.ContainsKey(ResponseContextKey))
        {
            context.Items[ResponseContextKey] = await strategy.ExecuteAsync(context.ToolId, context.Action, context.Input, cancellationToken);
        }

        return await next(context, cancellationToken);
    }
}
