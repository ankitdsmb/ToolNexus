using System.Collections.Concurrent;
using Polly;
using Polly.CircuitBreaker;
using Polly.Fallback;
using Polly.Timeout;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ToolExecutionResiliencePipelineProvider : IToolExecutionResiliencePipelineProvider
{
    private readonly ConcurrentDictionary<string, ResiliencePipeline<ToolExecutionResponse>> _pipelines = new(StringComparer.OrdinalIgnoreCase);

    public ResiliencePipeline<ToolExecutionResponse> GetPipeline(string toolSlug, IToolExecutionPolicy policy)
    {
        var key = $"{toolSlug}:{policy.TimeoutSeconds}:{policy.CircuitBreakerFailureThreshold}";
        return _pipelines.GetOrAdd(key, _ => BuildPipeline(policy));
    }

    private static ResiliencePipeline<ToolExecutionResponse> BuildPipeline(IToolExecutionPolicy policy)
    {
        var timeout = TimeSpan.FromSeconds(Math.Max(1, policy.TimeoutSeconds));
        var minimumThroughput = Math.Max(2, policy.CircuitBreakerFailureThreshold);

        var fallbackOptions = new FallbackStrategyOptions<ToolExecutionResponse>
        {
            ShouldHandle = new PredicateBuilder<ToolExecutionResponse>()
                .Handle<TimeoutRejectedException>()
                .Handle<BrokenCircuitException>(),
            FallbackAction = static args =>
            {
                var message = args.Outcome.Exception switch
                {
                    TimeoutRejectedException => "Tool execution timed out.",
                    BrokenCircuitException => "Tool temporarily unavailable due to repeated failures.",
                    _ => "Tool execution failed due to resilience policy."
                };

                return Outcome.FromResultAsValueTask(new ToolExecutionResponse(false, string.Empty, message));
            }
        };

        var breakerOptions = new CircuitBreakerStrategyOptions<ToolExecutionResponse>
        {
            ShouldHandle = new PredicateBuilder<ToolExecutionResponse>()
                .Handle<TimeoutRejectedException>()
                .HandleResult(response => !response.Success),
            FailureRatio = 1,
            SamplingDuration = TimeSpan.FromSeconds(30),
            MinimumThroughput = minimumThroughput,
            BreakDuration = TimeSpan.FromSeconds(30)
        };

        var timeoutOptions = new TimeoutStrategyOptions<ToolExecutionResponse>
        {
            Timeout = timeout
        };

        return new ResiliencePipelineBuilder<ToolExecutionResponse>()
            .AddFallback(fallbackOptions)
            .AddCircuitBreaker(breakerOptions)
            .AddTimeout(timeoutOptions)
            .Build();
    }
}
