using ToolNexus.Application.Models;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class ApiToolExecutionStrategy(IEnumerable<IToolExecutor> executors) : IApiToolExecutionStrategy
{
    private readonly Dictionary<string, IToolExecutor> _executorsBySlug = executors
        .ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    public async Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, CancellationToken cancellationToken = default)
    {
        var normalizedToolId = toolId.Trim();
        if (!_executorsBySlug.TryGetValue(normalizedToolId, out var executor))
        {
            return new ToolExecutionResponse(false, string.Empty, $"Tool '{normalizedToolId}' not found.", true);
        }

        var result = await executor.ExecuteAsync(new ToolRequest(action.Trim().ToLowerInvariant(), input), cancellationToken);
        return new ToolExecutionResponse(result.Success, result.Output, result.Error);
    }
}
