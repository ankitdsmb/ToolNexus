using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Csv;

public sealed class CsvToolExecutor : ToolExecutorBase
{
    public override string Slug => "csv-viewer";
    public override IReadOnlyCollection<string> SupportedActions { get; } = ["preview", "convert"];

    protected override Task<string> ExecuteActionAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        // TODO: Replace placeholder with rich CSV parsing/conversion.
        return Task.FromResult(request.Input);
    }
}
