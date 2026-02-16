using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public abstract class ToolExecutorBase : IToolExecutor
{
    public abstract string Slug { get; }

    public abstract IReadOnlyCollection<string> SupportedActions { get; }

    public async Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        var action = request.Action?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(action))
        {
            return ToolResult.Fail("Action is required.");
        }

        if (!SupportedActions.Contains(action, StringComparer.OrdinalIgnoreCase))
        {
            return ToolResult.Fail($"Action '{action}' is not supported by {Slug}.");
        }

        try
        {
            return await ExecuteCoreAsync(action, request, cancellationToken);
        }
        catch (Exception ex)
        {
            return ToolResult.Fail(ex.Message);
        }
    }

    protected abstract Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken);
}
