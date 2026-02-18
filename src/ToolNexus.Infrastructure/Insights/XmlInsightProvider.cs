using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Insights;

namespace ToolNexus.Infrastructure.Insights;

public sealed class XmlInsightProvider : IToolInsightProvider
{
    public string ToolSlug => "xml-formatter";

    public ToolInsightResult? GenerateInsight(string action, string input, string? error, IDictionary<string, string>? options)
    {
        var normalizedInput = (input ?? string.Empty).TrimStart();

        if (!string.IsNullOrWhiteSpace(error))
        {
            if (normalizedInput.Length == 0 || normalizedInput[0] != '<')
            {
                return new ToolInsightResult(
                    "XML must begin with a tag",
                    "XML content should begin with '<' and a root element.",
                    "Provide a single root tag that wraps your content.",
                    "<root><item>value</item></root>",
                    97);
            }

            return new ToolInsightResult(
                "XML appears malformed",
                "The document likely contains mismatched tags or invalid nesting.",
                "Ensure every opening tag has a matching closing tag in the correct order.",
                "<root><item>value</item></root>",
                95);
        }

        return new ToolInsightResult(
            "XML processed successfully",
            "The XML content completed the selected action without structural errors.",
            "Use a stable root node name to simplify parsing across systems.",
            null,
            100);
    }
}
