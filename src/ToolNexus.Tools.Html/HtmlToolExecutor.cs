using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Html;

public sealed class HtmlToolExecutor : IToolExecutor
{
    public string Slug => "html-formatter";

    public ToolMetadata Metadata { get; } = new(
        Name: "HTML Formatter",
        Description: "Normalize HTML spacing and minify basic markup.",
        Category: "Markup",
        ExampleInput: "<div> Hello </div>",
        CapabilityTags: ["html", "formatting", "minify"]);

    public IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        // TODO: Integrate dedicated HTML parser/minifier for safer transformations.
        return Task.FromResult(ToolResult.Ok(request.Input.Trim()));
    }
}
