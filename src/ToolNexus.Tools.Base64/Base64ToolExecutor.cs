using System.Text;
using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Base64;

public sealed class Base64ToolExecutor : ToolExecutorBase
{
    public override string Slug => "base64-encode";
    public override IReadOnlyCollection<string> SupportedActions { get; } = ["encode", "decode"];

    protected override Task<string> ExecuteActionAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = action.ToLowerInvariant() switch
        {
            "encode" => Convert.ToBase64String(Encoding.UTF8.GetBytes(request.Input)),
            "decode" => Encoding.UTF8.GetString(Convert.FromBase64String(request.Input)),
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        };

        return Task.FromResult(output);
    }
}
