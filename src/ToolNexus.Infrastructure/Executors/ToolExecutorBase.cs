using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public abstract class ToolExecutorBase : IToolExecutor
{
    public abstract string Slug { get; }

    public abstract ToolMetadata Metadata { get; }

    public abstract IReadOnlyCollection<string> SupportedActions { get; }

    public async Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return ToolResult.Fail("Request is required.");
        }

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
            var result = await ExecuteCoreAsync(action, request, cancellationToken);
            return NormalizeResult(result);
        }
        catch (Exception ex)
        {
            return ToolResult.Fail(string.IsNullOrWhiteSpace(ex.Message) ? "Execution failed." : ex.Message);
        }
    }

    protected abstract Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken);

    private static ToolResult NormalizeResult(ToolResult result)
    {
        if (result is null)
        {
            return ToolResult.Fail("Tool executor returned no result.");
        }

        if (result.Success)
        {
            return ToolResult.Ok(result.Output ?? string.Empty);
        }

        return ToolResult.Fail(result.Error ?? "Tool execution failed.");
    }
}
