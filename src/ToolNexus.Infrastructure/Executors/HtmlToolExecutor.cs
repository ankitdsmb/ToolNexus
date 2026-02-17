using ToolNexus.Application.Abstractions;

namespace ToolNexus.Infrastructure.Executors;

public sealed class HtmlToolExecutor : ToolExecutorBase
{
    public override string Slug => "html-formatter";
    public override ToolMetadata Metadata { get; } = new(
        "HTML Formatter",
        "Format or minify HTML snippets for readability and optimization.",
        "html",
        "<div><p>Hello</p></div>",
        ["html", "formatting", "minification"]);

    public override IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = action switch
        {
            "format" => request.Input.Trim(),
            "minify" => request.Input.Trim(),
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        };

        return Task.FromResult(ToolResult.Ok(output));
    }
}
