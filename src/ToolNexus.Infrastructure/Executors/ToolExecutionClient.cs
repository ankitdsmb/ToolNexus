using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Executors;

public sealed class ToolExecutionClient(
    IEnumerable<IToolExecutor> executors)
    : IToolExecutionClient
{
    private readonly Dictionary<string, IToolExecutor> _executorsBySlug =
        executors.ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

    public async Task<ToolExecutionClientResult> ExecuteAsync(
        string slug,
        ToolRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_executorsBySlug.TryGetValue(slug, out var executor))
        {
            return ToolExecutionClientResult.ToolNotFound();
        }

        var result = await executor.ExecuteAsync(request, cancellationToken);

        return ToolExecutionClientResult.Executed(result);
    }
}
