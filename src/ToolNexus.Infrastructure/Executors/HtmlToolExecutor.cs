using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class HtmlToolExecutor : IToolExecutor
{
    public string Slug => "html-formatter";
    public IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ToolResult.Ok(request.Input.Trim()));
    }
}
