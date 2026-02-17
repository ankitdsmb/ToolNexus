using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline.Steps;

public sealed class RateLimitStep(IToolConcurrencyLimiter concurrencyLimiter) : IToolExecutionStep
{
    public int Order => 300;

    public async Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken)
    {
        var maxConcurrency = context.Policy?.MaxConcurrency ?? 8;
        using var scope = await concurrencyLimiter.AcquireAsync(context.ToolId, maxConcurrency, cancellationToken);
        return await next(context, cancellationToken);
    }
}
