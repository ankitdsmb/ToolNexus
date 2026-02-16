using System.Xml.Linq;
using ToolNexus.Domain;

namespace ToolNexus.Infrastructure.Executors;

public sealed class XmlToolExecutor : IToolExecutor
{
    public string Slug => "xml-formatter";
    public IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify", "validate"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        var action = request.Options?.GetValueOrDefault("action") ?? "format";

        try
        {
            return Task.FromResult(action switch
            {
                "format" => ToolResult.Ok(XDocument.Parse(request.Input).ToString()),
                "minify" => ToolResult.Ok(XDocument.Parse(request.Input).ToString(SaveOptions.DisableFormatting)),
                "validate" => Validate(request.Input),
                _ => ToolResult.Fail($"Unsupported action: {action}")
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(ToolResult.Fail(ex.Message));
        }
    }

    private static ToolResult Validate(string input)
    {
        _ = XDocument.Parse(input);
        return ToolResult.Ok("Valid XML");
    }
}
