using System.Text.RegularExpressions;
using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class MinifierToolExecutor : IToolExecutor
{
    public string Slug => "css-minifier";
    public IReadOnlyCollection<string> SupportedActions { get; } = ["minify", "format"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        var minified = Regex.Replace(request.Input, "\\s+", " ").Trim();
        return Task.FromResult(ToolResult.Ok(minified));
    }
}
