using System.Text.Json;
using System.Text.RegularExpressions;

namespace ToolNexus.Api.Controllers.Marketplace;

public sealed class ToolSubmissionValidator
{
    private static readonly Regex SlugRegex = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

    private static readonly string[] RemoteScriptPatterns =
    [
        "http://",
        "https://",
        "<script",
        "src=",
        "import(",
        "import ",
        "require(\"http",
        "require('http"
    ];

    public IReadOnlyList<string> Validate(ToolPublishRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Slug) || !SlugRegex.IsMatch(request.Slug))
        {
            errors.Add("slug must be lowercase kebab-case.");
        }

        ValidateJsonObject(request.Manifest, "manifest", errors);
        ValidateJsonObject(request.Schema, "schema", errors);

        if (string.IsNullOrWhiteSpace(request.RuntimeModule))
        {
            errors.Add("runtimeModule is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Template))
        {
            errors.Add("template is required.");
        }

        if (ContainsRemoteScriptInjection(request.Manifest) ||
            ContainsRemoteScriptInjection(request.Schema) ||
            ContainsRemoteScriptInjection(request.RuntimeModule) ||
            ContainsRemoteScriptInjection(request.Template))
        {
            errors.Add("submission contains disallowed remote script references.");
        }

        return errors;
    }

    private static void ValidateJsonObject(string value, string fieldName, ICollection<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add($"{fieldName} is required.");
            return;
        }

        try
        {
            using var document = JsonDocument.Parse(value);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                errors.Add($"{fieldName} must be a valid JSON object.");
                return;
            }

            if (fieldName == "manifest" && !document.RootElement.TryGetProperty("name", out _))
            {
                errors.Add("manifest must include a name property.");
            }

            if (fieldName == "schema" &&
                (!document.RootElement.TryGetProperty("type", out var typeProperty) ||
                 typeProperty.ValueKind != JsonValueKind.String ||
                 !string.Equals(typeProperty.GetString(), "object", StringComparison.OrdinalIgnoreCase)))
            {
                errors.Add("schema must include type=object.");
            }
        }
        catch (JsonException)
        {
            errors.Add($"{fieldName} must be valid JSON.");
        }
    }

    private static bool ContainsRemoteScriptInjection(string source)
    {
        return RemoteScriptPatterns.Any(pattern => source.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }
}
