using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Html;

public sealed class HtmlToolExecutor : ToolExecutorBase
{
    public override string Slug => "html-formatter";
    public override IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify"];

    protected override Task<string> ExecuteActionAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        // TODO: Integrate dedicated HTML parser/minifier for safer transformations.
        return Task.FromResult(request.Input.Trim());
    }
}
