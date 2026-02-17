using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ApiToolExecutionStrategy(
    IEnumerable<IToolExecutor> executors,
    IToolExecutionResiliencePipelineProvider resiliencePipelines,
    ToolExecutionMetrics metrics) : IApiToolExecutionStrategy
{
    private readonly Dictionary<string, IToolExecutor> _executorsBySlug = executors
        .ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    public async Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default)
    {
        var normalizedToolId = toolId.Trim();
        if (!_executorsBySlug.TryGetValue(normalizedToolId, out var executor))
        {
            return new ToolExecutionResponse(false, string.Empty, $"Tool '{normalizedToolId}' not found.", true);
        }

        if (policy is null)
        {
            return new ToolExecutionResponse(false, string.Empty, "Execution policy was not resolved.");
        }

        var tags = new KeyValuePair<string, object?>[]
        {
            new("tool_slug", normalizedToolId),
            new("action", action),
            new("cache_status", "n/a")
        };

        var pipeline = resiliencePipelines.GetPipeline(normalizedToolId, policy);

        async ValueTask<ToolExecutionResponse> ExecuteCoreAsync(CancellationToken token)
        {
            var result = await executor.ExecuteAsync(new ToolRequest(action.Trim().ToLowerInvariant(), input), token);
            if (!result.Success && result.Error?.Contains("timed out", StringComparison.OrdinalIgnoreCase) == true)
            {
                metrics.Timeouts.Add(1, tags);
            }

            return new ToolExecutionResponse(result.Success, result.Output, result.Error);
        }

        return await pipeline.ExecuteAsync(ExecuteCoreAsync, cancellationToken);
    }
}
