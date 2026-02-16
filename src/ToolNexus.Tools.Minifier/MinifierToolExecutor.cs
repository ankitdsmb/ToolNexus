using System.Text.RegularExpressions;
using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Minifier;

public sealed class MinifierToolExecutor : ToolExecutorBase
{
    public override string Slug => "css-minifier";
    public override IReadOnlyCollection<string> SupportedActions { get; } = ["minify", "format"];

    protected override Task<string> ExecuteActionAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = action.ToLowerInvariant() switch
        {
            "minify" => Regex.Replace(request.Input, "\\s+", " ").Trim(),
            "format" => request.Input,
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        };

        return Task.FromResult(output);
    }
}
