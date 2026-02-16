using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Csv;

public sealed class CsvToolExecutor : IToolExecutor
{
    public string Slug => "csv-viewer";
    public IReadOnlyCollection<string> SupportedActions { get; } = ["preview", "convert"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        // TODO: Replace placeholder with rich CSV parsing/conversion.
        return Task.FromResult(ToolResult.Ok(request.Input));
    }
}
