using System.Text.Json;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AiToolPackageImportService(
    IAiToolPackageRepository repository,
    IToolDefinitionService toolDefinitionService) : IAiToolPackageImportService
{
    private const int MaxPayloadBytes = 512 * 1024;
    private static readonly HashSet<string> AllowedTypes = ["js", "html", "css", "json", "md"];

    public AiToolPackageTemplateResponse GetTemplate()
    {
        const string template = """
{
  "contractVersion": "v1",
  "tool": {
    "slug": "sample-ai-tool",
    "title": "Sample AI Tool",
    "description": "Tool imported from AI JSON package"
  },
  "runtime": {
    "uiMode": "auto",
    "complexityTier": 1,
    "executionAuthority": "ShadowOnly"
  },
  "ui": {
    "viewName": "ToolShell"
  },
  "seo": {
    "title": "Sample AI Tool",
    "description": "Admin-preview imported capability"
  },
  "files": [
    {
      "path": "tool.js",
      "type": "js",
      "content": "export default { mount(){ return { destroy(){} }; } };"
    }
  ]
}
""";

        const string prompt = "Generate a ToolNexus capability package that exactly matches the provided JSON schema and only includes virtual files for /tools/{slug}/virtual/.";
        return new AiToolPackageTemplateResponse(template, prompt);
    }

    public async Task<AiToolPackageImportValidationResult> ValidateAsync(string jsonPayload, CancellationToken cancellationToken)
    {
        var errors = new List<string>();
        var normalizedPayload = jsonPayload ?? string.Empty;
        var payloadBytes = System.Text.Encoding.UTF8.GetByteCount(normalizedPayload);
        if (payloadBytes == 0)
        {
            errors.Add("JSON payload is required.");
            return new AiToolPackageImportValidationResult(false, errors, null);
        }

        if (payloadBytes > MaxPayloadBytes)
        {
            errors.Add($"JSON payload exceeds {MaxPayloadBytes} byte limit.");
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(normalizedPayload);
        }
        catch (JsonException ex)
        {
            return new AiToolPackageImportValidationResult(false, [$"Invalid JSON: {ex.Message}"], null);
        }

        using (document)
        {
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return new AiToolPackageImportValidationResult(false, ["Root payload must be a JSON object."], null);
            }

            var contractVersion = GetString(root, "contractVersion", errors);
            if (!string.Equals(contractVersion, "v1", StringComparison.Ordinal))
            {
                errors.Add("contractVersion must be 'v1'.");
            }

            var toolObj = GetObject(root, "tool", errors);
            var runtimeObj = GetObject(root, "runtime", errors);
            var uiObj = GetObject(root, "ui", errors);
            var seoObj = GetObject(root, "seo", errors);

            var slug = toolObj is null ? string.Empty : (GetString(toolObj.Value, "slug", errors) ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(slug))
            {
                errors.Add("tool.slug is required.");
            }

            if (!System.Text.RegularExpressions.Regex.IsMatch(slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
            {
                errors.Add("tool.slug must be kebab-case.");
            }

            var filesElement = root.TryGetProperty("files", out var filesProp) ? filesProp : default;
            if (filesElement.ValueKind != JsonValueKind.Array)
            {
                errors.Add("files must be an array.");
            }

            var files = new List<AiToolVirtualFile>();
            if (filesElement.ValueKind == JsonValueKind.Array)
            {
                if (filesElement.GetArrayLength() == 0)
                {
                    errors.Add("files must include at least one file.");
                }

                foreach (var file in filesElement.EnumerateArray())
                {
                    if (file.ValueKind != JsonValueKind.Object)
                    {
                        errors.Add("Each files[] item must be an object.");
                        continue;
                    }

                    var path = (GetString(file, "path", errors) ?? string.Empty).Trim();
                    var type = (GetString(file, "type", errors) ?? string.Empty).Trim().ToLowerInvariant();
                    var content = GetString(file, "content", errors) ?? string.Empty;

                    if (!AllowedTypes.Contains(type))
                    {
                        errors.Add($"files[].type '{type}' is not allowed.");
                    }

                    if (string.IsNullOrWhiteSpace(path))
                    {
                        errors.Add("files[].path is required.");
                    }
                    else if (IsForbiddenPath(path))
                    {
                        errors.Add($"files[].path '{path}' is forbidden.");
                    }

                    if (type == "js" && ContainsBannedJavaScript(content))
                    {
                        errors.Add($"files[].path '{path}' contains banned JavaScript patterns.");
                    }

                    files.Add(new AiToolVirtualFile(path, type, content));
                }
            }

            if (!string.IsNullOrWhiteSpace(slug))
            {
                if (await repository.ExistsBySlugAsync(slug, cancellationToken))
                {
                    errors.Add($"Slug '{slug}' already exists in AI tool packages.");
                }

                var existingTools = await toolDefinitionService.GetListAsync(cancellationToken);
                if (existingTools.Any(x => string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase)))
                {
                    errors.Add($"Slug '{slug}' already exists in tool definitions.");
                }
            }

            if (errors.Count > 0)
            {
                return new AiToolPackageImportValidationResult(false, errors, null);
            }

            var contract = new AiToolPackageContract(
                contractVersion!,
                slug,
                toolObj!.Value.GetRawText(),
                runtimeObj!.Value.GetRawText(),
                uiObj!.Value.GetRawText(),
                seoObj!.Value.GetRawText(),
                files,
                normalizedPayload);

            return new AiToolPackageImportValidationResult(true, Array.Empty<string>(), contract);
        }
    }

    public async Task<AiToolPackageRecord> CreateDraftAsync(AiToolPackageImportRequest request, CancellationToken cancellationToken)
    {
        var validation = await ValidateAsync(request.JsonPayload, cancellationToken);
        if (!validation.IsValid || validation.Contract is null)
        {
            throw new InvalidOperationException($"AI tool package import failed: {string.Join("; ", validation.Errors)}");
        }

        return await repository.CreateAsync(validation.Contract, request.CorrelationId, request.TenantId, cancellationToken);
    }

    public async Task<AiToolPackageContract?> GetContractBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var record = await repository.GetBySlugAsync(slug.Trim().ToLowerInvariant(), cancellationToken);
        if (record is null)
        {
            return null;
        }

        var validation = await ValidateAsync(record.JsonPayload, cancellationToken);
        return validation.Contract;
    }

    private static JsonElement? GetObject(JsonElement parent, string property, List<string> errors)
    {
        if (!parent.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Object)
        {
            errors.Add($"{property} must be an object.");
            return null;
        }

        return value;
    }

    private static string? GetString(JsonElement parent, string property, List<string> errors)
    {
        if (!parent.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.String)
        {
            errors.Add($"{property} must be a string.");
            return null;
        }

        return value.GetString();
    }

    private static bool IsForbiddenPath(string path)
    {
        var normalized = path.Replace('\\', '/').Trim();
        return normalized.StartsWith('/')
               || normalized.Contains("..", StringComparison.Ordinal)
               || normalized.StartsWith("src/", StringComparison.OrdinalIgnoreCase)
               || normalized.StartsWith("runtime/", StringComparison.OrdinalIgnoreCase)
               || normalized.StartsWith(".git", StringComparison.OrdinalIgnoreCase)
               || normalized.Contains("appsettings", StringComparison.OrdinalIgnoreCase);
    }

    private static bool ContainsBannedJavaScript(string content)
    {
        return content.Contains("eval(", StringComparison.OrdinalIgnoreCase)
               || content.Contains("window.location =", StringComparison.OrdinalIgnoreCase)
               || content.Contains("window.location.href =", StringComparison.OrdinalIgnoreCase);
    }
}
