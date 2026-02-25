namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class ExecutionStep(
    IUniversalExecutionEngine universalExecutionEngine,
    UniversalExecutionRequestMapper requestMapper) : IToolExecutionStep
{
    public int Order => 500;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        if (context.Response is null)
        {
            var request = requestMapper.Map(context);
            var universalResult = await universalExecutionEngine.ExecuteAsync(request, context, cancellationToken);
            context.Response = universalResult.ToToolExecutionResponse();
        }

        return await next(context, cancellationToken);
    }
}
