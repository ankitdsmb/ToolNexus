using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Insights;

namespace ToolNexus.Infrastructure.Insights;

public sealed class JsonInsightProvider : IToolInsightProvider
{
    public string ToolSlug => "json-formatter";

    public ToolInsightResult? GenerateInsight(string action, string input, string? error, IDictionary<string, string>? options)
    {
        var normalizedAction = (action ?? string.Empty).Trim().ToLowerInvariant();
        var normalizedInput = (input ?? string.Empty).TrimStart();

        if (!string.IsNullOrWhiteSpace(error))
        {
            if (normalizedInput.Length > 0 && normalizedInput[0] != '{' && normalizedInput[0] != '[')
            {
                return new ToolInsightResult(
                    "Input does not start as JSON",
                    "JSON payloads should begin with '{' for objects or '[' for arrays.",
                    "Wrap your data in a JSON object or array before formatting.",
                    "{\"items\":[1,2,3]}",
                    98);
            }

            return new ToolInsightResult(
                "JSON structure looks invalid",
                "The action failed because the payload has a structural issue such as a missing comma, quote, or closing bracket.",
                "Validate brackets and commas, then rerun the action.",
                "{\"name\":\"Ada\",\"role\":\"Engineer\"}",
                94);
        }

        if (normalizedAction == "minify")
        {
            return new ToolInsightResult(
                "JSON minified successfully",
                "Minified JSON is compact and optimized for transport.",
                "Use formatted JSON while editing and minified JSON for payload size savings.",
                null,
                100);
        }

        if (normalizedAction == "validate")
        {
            return new ToolInsightResult(
                "JSON validation passed",
                "The payload is structurally valid JSON.",
                "If downstream consumers fail, verify required schema fields and value types.",
                null,
                100);
        }

        return new ToolInsightResult(
            "JSON output is normalized",
            "The JSON has been processed deterministically for the selected action.",
            "Keep property naming and value types consistent to reduce integration errors.",
            null,
            99);
    }
}
