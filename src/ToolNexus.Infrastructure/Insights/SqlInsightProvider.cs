using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Insights;

namespace ToolNexus.Infrastructure.Insights;

public sealed class SqlInsightProvider : IToolInsightProvider
{
    public string ToolSlug => "sql-formatter";

    public ToolInsightResult? GenerateInsight(string action, string input, string? error, IDictionary<string, string>? options)
    {
        var normalizedInput = (input ?? string.Empty).Trim();
        var normalizedAction = (action ?? string.Empty).Trim().ToLowerInvariant();

        if (!string.IsNullOrWhiteSpace(error))
        {
            if (normalizedInput.IndexOf(';') >= 0 && normalizedInput.IndexOf("--", StringComparison.Ordinal) >= 0)
            {
                return new ToolInsightResult(
                    "Potential mixed SQL statement styles",
                    "The query combines delimiters and inline comments in a way that may confuse formatters.",
                    "Keep one statement per block and move comments to separate lines.",
                    "SELECT id, name\nFROM users\nWHERE active = 1;",
                    90);
            }

            return new ToolInsightResult(
                "SQL text could not be processed cleanly",
                "The SQL input may have unbalanced parentheses, incomplete clauses, or unsupported dialect syntax.",
                "Start with a minimal valid SELECT/UPDATE statement, then expand incrementally.",
                "SELECT id, name FROM users WHERE active = 1;",
                92);
        }

        if (normalizedAction == "minify")
        {
            return new ToolInsightResult(
                "SQL minified",
                "Whitespace was reduced while preserving query semantics.",
                "Use minified SQL for compact transfer and formatted SQL during review.",
                null,
                99);
        }

        return new ToolInsightResult(
            "SQL formatted",
            "Formatting improves readability of clauses and nesting.",
            "Group SELECT columns logically and keep predicate order consistent.",
            null,
            100);
    }
}
