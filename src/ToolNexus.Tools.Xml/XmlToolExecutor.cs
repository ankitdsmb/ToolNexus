using System.Xml.Linq;
using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Xml;

public sealed class XmlToolExecutor : ToolExecutorBase
{
    public override string Slug => "xml-formatter";
    public override IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify", "validate"];

    protected override Task<string> ExecuteActionAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = action.ToLowerInvariant() switch
        {
            "format" => XDocument.Parse(request.Input).ToString(),
            "minify" => XDocument.Parse(request.Input).ToString(SaveOptions.DisableFormatting),
            "validate" => Validate(request.Input),
            _ => throw new InvalidOperationException($"Unsupported action: {action}")
        };

        return Task.FromResult(output);
    }

    private static string Validate(string input)
    {
        _ = XDocument.Parse(input);
        return "Valid XML";
    }
}
