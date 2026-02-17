using System.Xml.Linq;
using ToolNexus.Application.Abstractions;
namespace ToolNexus.Infrastructure.Executors;

public sealed class XmlToolExecutor : ToolExecutorBase
{
    public override string Slug => "xml-formatter";
    public override ToolMetadata Metadata { get; } = new(
        "XML Formatter",
        "Format, minify, and validate XML documents.",
        "xml",
        "<root><item>1</item></root>",
        ["xml", "formatting", "validation"]);

    public override IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify", "validate"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        return Task.FromResult(action switch
        {
            "format" => ToolResult.Ok(XDocument.Parse(request.Input).ToString()),
            "minify" => ToolResult.Ok(XDocument.Parse(request.Input).ToString(SaveOptions.DisableFormatting)),
            "validate" => Validate(request.Input),
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        });
    }

    private static ToolResult Validate(string input)
    {
        _ = XDocument.Parse(input);
        return ToolResult.Ok("Valid XML");
    }
}
