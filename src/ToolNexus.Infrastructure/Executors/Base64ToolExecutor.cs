using System.Text;
using ToolNexus.Application.Abstractions;

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
        if (action == "encode")
        {
            var output = Convert.ToBase64String(Encoding.UTF8.GetBytes(request.Input));
            return Task.FromResult(ToolResult.Ok(output));
        }

        if (action == "decode")
        {
            try
            {
                var output = Encoding.UTF8.GetString(Convert.FromBase64String(request.Input));
                return Task.FromResult(ToolResult.Ok(output));
            }
            catch (FormatException)
            {
                return Task.FromResult(ToolResult.Fail("Invalid Base64 input"));
            }
        }

        throw new InvalidOperationException($"Unsupported action: {action}");
    }
}
