using System.Text;
using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Base64;

public sealed class Base64ToolExecutor : IToolExecutor
{
    public string Slug => "base64-encode";

    public ToolMetadata Metadata { get; } = new(
        Name: "Base64 Encoder/Decoder",
        Description: "Encode plain text to Base64 and decode Base64 back to text.",
        Category: "Encoding",
        ExampleInput: "hello world",
        CapabilityTags: ["base64", "encoding", "decoding"]);

    public IReadOnlyCollection<string> SupportedActions { get; } = ["encode", "decode"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        var action = request.Options?.GetValueOrDefault("action") ?? "encode";

        try
        {
            var output = action switch
            {
                "encode" => Convert.ToBase64String(Encoding.UTF8.GetBytes(request.Input)),
                "decode" => Encoding.UTF8.GetString(Convert.FromBase64String(request.Input)),
                _ => throw new InvalidOperationException($"Unsupported action: {action}")
            };

            return Task.FromResult(ToolResult.Ok(output));
        }
        catch (Exception ex)
        {
            return Task.FromResult(ToolResult.Fail(ex.Message));
        }
    }
}
