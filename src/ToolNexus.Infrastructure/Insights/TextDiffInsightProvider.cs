using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Insights;

namespace ToolNexus.Infrastructure.Insights;

public sealed class TextDiffInsightProvider : IToolInsightProvider
{
    public string ToolSlug => "text-diff";

    public ToolInsightResult? GenerateInsight(string action, string input, string? error, IDictionary<string, string>? options)
    {
        if (!string.IsNullOrWhiteSpace(error))
        {
            return new ToolInsightResult(
                "Diff input could not be compared",
                "The text blocks may be missing expected separators or are empty.",
                "Provide both left and right text blocks using the tool's expected format.",
                "left: hello\nright: hallo",
                91);
        }

        if (string.IsNullOrWhiteSpace(input))
        {
            return new ToolInsightResult(
                "No content to compare",
                "Diff comparison requires two non-empty text blocks.",
                "Add content to both sides before running compare.",
                "left: line one\nright: line 1",
                100);
        }

        return new ToolInsightResult(
            "Diff comparison completed",
            "Text comparison was generated deterministically from the provided input.",
            "Split large paragraphs into lines to make differences easier to review.",
            null,
            100);
    }
}
