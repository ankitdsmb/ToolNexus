using System.Text.RegularExpressions;
using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class MinifierToolExecutor : ToolExecutorBase
{
    public override string Slug => "css-minifier";
    public override IReadOnlyCollection<string> SupportedActions { get; } = ["minify", "format"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = action switch
        {
            "minify" => Regex.Replace(request.Input, "\\s+", " ").Trim(),
            "format" => request.Input,
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        };

        return Task.FromResult(ToolResult.Ok(output));
    }
}
