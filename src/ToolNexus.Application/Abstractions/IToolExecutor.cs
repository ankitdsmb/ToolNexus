namespace ToolNexus.Application.Abstractions;

public interface IToolExecutor
{
    string Slug { get; }

    ToolMetadata Metadata { get; }

    IReadOnlyCollection<string> SupportedActions { get; }

    Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default);
}
