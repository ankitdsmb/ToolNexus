using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class CsvToolExecutor : IToolExecutor
{
    public string Slug => "csv-viewer";
    public IReadOnlyCollection<string> SupportedActions { get; } = ["preview", "convert"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ToolResult.Ok(request.Input));
    }
}
