using ToolNexus.Application.Models;
using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public sealed class ToolService(IEnumerable<IToolExecutor> executors) : IToolService
{
    private readonly Dictionary<string, IToolExecutor> _executorsBySlug = executors
        .ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    public async Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        if (!_executorsBySlug.TryGetValue(request.Slug, out var executor))
        {
            return new ToolExecutionResponse(false, string.Empty, $"Tool '{request.Slug}' not found.", true);
        }

        var options = request.Options is null
            ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string>(request.Options, StringComparer.OrdinalIgnoreCase);

        options["action"] = request.Action;
        var result = await executor.ExecuteAsync(new ToolRequest(request.Input, options), cancellationToken);

        return new ToolExecutionResponse(result.Success, result.Output, result.Error);
    }
}
