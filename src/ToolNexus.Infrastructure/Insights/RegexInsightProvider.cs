using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Insights;

namespace ToolNexus.Infrastructure.Insights;

public sealed class RegexInsightProvider : IToolInsightProvider
{
    public string ToolSlug => "regex-tester";

    public ToolInsightResult? GenerateInsight(string action, string input, string? error, IDictionary<string, string>? options)
    {
        var pattern = (input ?? string.Empty).Trim();

        if (!string.IsNullOrWhiteSpace(error))
        {
            if (pattern.Contains("(") && !pattern.Contains(")"))
            {
                return new ToolInsightResult(
                    "Unclosed capture group",
                    "The regex contains an opening '(' without a matching ')'.",
                    "Close each capture group or use non-capturing groups where appropriate.",
                    "^(?:\\w+)@(?:\\w+)\\.com$",
                    99);
            }

            if (pattern.Contains("[") && !pattern.Contains("]"))
            {
                return new ToolInsightResult(
                    "Unclosed character class",
                    "A character class starts with '[' but does not close with ']'.",
                    "Close character classes and escape special characters inside them.",
                    "^[A-Za-z0-9_]+$",
                    99);
            }

            return new ToolInsightResult(
                "Regex syntax issue",
                "The regular expression likely contains invalid grouping, quantifier placement, or escaping.",
                "Validate delimiters first, then test with a small sample input.",
                "^\\w+@\\w+\\.com$",
                93);
        }

        return new ToolInsightResult(
            "Regex evaluated",
            "The pattern executed successfully for the provided action.",
            "Anchor patterns with ^ and $ when full-string matches are intended.",
            null,
            100);
    }
}
