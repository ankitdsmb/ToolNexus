using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ClientExecutionStep(IEnumerable<IClientToolExecutionStrategy> strategies) : IToolExecutionStep
{
    private readonly IReadOnlyList<IClientToolExecutionStrategy> _strategies = strategies.ToArray();

    public int Order => 300;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        foreach (var strategy in _strategies)
        {
            var response = await strategy.TryExecuteAsync(context.ToolId, context.Action, context.Input, cancellationToken);
            if (response is not null)
            {
                context.Items[ApiExecutionStep.ResponseContextKey] = response;
                break;
            }
        }

        return await next(context, cancellationToken);
    }
}
