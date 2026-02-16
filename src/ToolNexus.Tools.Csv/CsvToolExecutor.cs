using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Csv;

public sealed class CsvToolExecutor : IToolExecutor
{
    public string Slug => "csv-viewer";

    public ToolMetadata Metadata { get; } = new(
        Name: "CSV Viewer",
        Description: "Preview and convert CSV data.",
        Category: "Data Conversion",
        ExampleInput: "name,age\nAda,36",
        CapabilityTags: ["csv", "preview", "conversion"]);

    public IReadOnlyCollection<string> SupportedActions { get; } = ["preview", "convert"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        // TODO: Replace placeholder with rich CSV parsing/conversion.
        return Task.FromResult(ToolResult.Ok(request.Input));
    }
}
