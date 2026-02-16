using System.Text.RegularExpressions;
using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Minifier;

public sealed class MinifierToolExecutor : IToolExecutor
{
    public string Slug => "css-minifier";

    public ToolMetadata Metadata { get; } = new(
        Name: "CSS Minifier",
        Description: "Minify and format CSS snippets.",
        Category: "Styles",
        ExampleInput: "body { color: red; }",
        CapabilityTags: ["css", "minify", "formatting"]);

    public IReadOnlyCollection<string> SupportedActions { get; } = ["minify", "format"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        var minified = Regex.Replace(request.Input, "\\s+", " ").Trim();
        return Task.FromResult(ToolResult.Ok(minified));
    }
}
