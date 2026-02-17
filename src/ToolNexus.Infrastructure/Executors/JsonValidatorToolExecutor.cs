using System.Text.Json;
using ToolNexus.Application.Abstractions;

namespace ToolNexus.Infrastructure.Executors;

public sealed class JsonValidatorToolExecutor : ToolExecutorBase
{
    public override string Slug => "json-validator";

    public override ToolMetadata Metadata { get; } = new(
        "JSON Validator",
        "Validate JSON and pinpoint structural errors.",
        "json",
        "{\"valid\": true}",
        ["json", "validation"]);

    public override IReadOnlyCollection<string> SupportedActions { get; } = ["validate"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        using var _ = JsonDocument.Parse(request.Input);
        return Task.FromResult(ToolResult.Ok("Valid JSON"));
    }
}
