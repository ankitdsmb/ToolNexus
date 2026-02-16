using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class CsvToolExecutor : ToolExecutorBase
{
    public override string Slug => "csv-viewer";
    public override IReadOnlyCollection<string> SupportedActions { get; } = ["preview", "convert"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        return Task.FromResult(ToolResult.Ok(request.Input));
    }
}
