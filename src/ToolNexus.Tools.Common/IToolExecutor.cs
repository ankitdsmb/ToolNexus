namespace ToolNexus.Tools.Common;

public interface IToolExecutor
{
    string Slug { get; }

    IReadOnlyCollection<string> SupportedActions { get; }

    Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default);
}
