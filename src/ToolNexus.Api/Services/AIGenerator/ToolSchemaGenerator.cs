using System.Text.Json;
using System.Text.RegularExpressions;

namespace ToolNexus.Api.Services.AIGenerator;

public sealed class ToolSchemaGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public string Generate(string prompt)
    {
        var capability = DeriveCapability(prompt);
        var operation = ToOperationName(capability);

        var schema = new ToolSchemaArtifact(
            Slug: ToSlug(capability),
            Inputs: [new ToolSchemaField("textarea", "input")],
            Actions: [new ToolSchemaAction(operation)],
            Outputs: [new ToolSchemaField("textarea", "result")]);

        return JsonSerializer.Serialize(schema, JsonOptions);
    }

    public string DeriveCapability(string prompt)
    {
        if (string.IsNullOrWhiteSpace(prompt))
        {
            throw new ArgumentException("Prompt is required.", nameof(prompt));
        }

        var normalized = prompt.Trim();
        normalized = Regex.Replace(normalized, "^create\\s+a\\s+tool\\s+that\\s+", string.Empty, RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, "^build\\s+a\\s+tool\\s+that\\s+", string.Empty, RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, "^generate\\s+a\\s+tool\\s+that\\s+", string.Empty, RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, "^create\\s+a\\s+tool\\s+to\\s+", string.Empty, RegexOptions.IgnoreCase);

        return normalized.Trim().TrimEnd('.');
    }

    public string ToSlug(string value)
    {
        var lower = value.ToLowerInvariant();
        var sanitized = Regex.Replace(lower, "[^a-z0-9]+", "-");
        var slug = sanitized.Trim('-');

        return string.IsNullOrWhiteSpace(slug) ? "generated-tool" : slug;
    }

    private static string ToOperationName(string value)
    {
        var words = Regex.Matches(value.ToLowerInvariant(), "[a-z0-9]+")
            .Select(m => m.Value)
            .ToArray();

        if (words.Length == 0)
        {
            return "runTool";
        }

        var first = words[0];
        var rest = words.Skip(1).Select(Capitalize);
        return string.Concat(first, string.Concat(rest));
    }

    private static string Capitalize(string value)
        => value.Length == 0 ? value : char.ToUpperInvariant(value[0]) + value[1..];

    private sealed record ToolSchemaArtifact(
        string Slug,
        IReadOnlyList<ToolSchemaField> Inputs,
        IReadOnlyList<ToolSchemaAction> Actions,
        IReadOnlyList<ToolSchemaField> Outputs);

    private sealed record ToolSchemaField(string Type, string Name);

    private sealed record ToolSchemaAction(string Operation);
}
