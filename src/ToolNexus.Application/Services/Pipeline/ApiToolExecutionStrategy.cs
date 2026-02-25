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
        var request = new UniversalExecutionRequest(
            toolId,
            action,
            input,
            ToolRuntimeLanguage.DotNet,
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase),
            null,
            null);

        var result = await ExecuteAsync(request, policy, cancellationToken);
        return result.Response;
    }

    public async Task<UniversalExecutionResult> ExecuteAsync(UniversalExecutionRequest request, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default)
    {
        var normalizedToolId = request.ToolId.Trim();
        if (!_executorsBySlug.TryGetValue(normalizedToolId, out var executor))
        {
            return new UniversalExecutionResult(
                new ToolExecutionResponse(false, string.Empty, $"No execution adapter is registered for tool '{normalizedToolId}'.", true),
                request.Language,
                "none",
                "missing");
        }

        if (policy is null)
        {
            return new UniversalExecutionResult(
                new ToolExecutionResponse(false, string.Empty, "Execution policy was not resolved."),
                request.Language,
                executor.GetType().Name,
                "resolved");
        }

        var tags = new KeyValuePair<string, object?>[]
        {
            new("tool_slug", normalizedToolId),
            new("action", request.Action),
            new("cache_status", "n/a")
        };

        var pipeline = resiliencePipelines.GetPipeline(normalizedToolId, policy);

        async ValueTask<ToolExecutionResponse> ExecuteCoreAsync(CancellationToken token)
        {
            var executionRequest = new ToolRequest(request.Action.Trim().ToLowerInvariant(), request.Input, request.Options);
            var result = await executor.ExecuteAsync(executionRequest, token);
            if (!result.Success && result.Error?.Contains("timed out", StringComparison.OrdinalIgnoreCase) == true)
            {
                metrics.Timeouts.Add(1, tags);
            }

            return new ToolExecutionResponse(result.Success, result.Output, result.Error);
        }

        var response = await pipeline.ExecuteAsync(ExecuteCoreAsync, cancellationToken);
        return new UniversalExecutionResult(response, request.Language, executor.GetType().Name, "resolved");
    }
}
