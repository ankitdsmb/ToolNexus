using System.Text;
using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class Base64ToolExecutor : ToolExecutorBase
{
    public override string Slug => "base64-encode";
    public override ToolMetadata Metadata { get; } = new(
        "Base64 Encode/Decode",
        "Encode plain text to Base64 or decode Base64 back to text.",
        "encoding",
        "hello-toolnexus",
        ["encoding", "base64", "text-transform"]);

    public override IReadOnlyCollection<string> SupportedActions { get; } = ["encode", "decode"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = action switch
        {
            "encode" => Convert.ToBase64String(Encoding.UTF8.GetBytes(request.Input)),
            "decode" => Encoding.UTF8.GetString(Convert.FromBase64String(request.Input)),
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        };

        return Task.FromResult(ToolResult.Ok(output));
    }
}
