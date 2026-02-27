using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AiToolPackageImportService(
    IAiToolPackageRepository repository,
    IToolDefinitionService toolDefinitionService) : IAiToolPackageImportService
{
    private const int MaxPayloadBytes = 512 * 1024;
    private static readonly HashSet<string> AllowedTypes = ["js", "html", "css", "json", "md"];
    private static readonly Regex MultiDashRegex = new("-{2,}", RegexOptions.Compiled);

    public async Task<AiToolContractGenerationResponse> GenerateContractAsync(AiToolContractGenerationRequest request, CancellationToken cancellationToken)
    {
        var slug = ToSlug(request.ToolIdea);
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "generated-tool";
        }

        var incomingDup = request.ExistingToolSlugs?.Any(x => string.Equals(ToSlug(x), slug, StringComparison.OrdinalIgnoreCase)) == true;
        var packageDup = await repository.ExistsBySlugAsync(slug, cancellationToken);
        var existingTools = await toolDefinitionService.GetListAsync(cancellationToken);
        var toolDup = existingTools.Any(x => string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));

        if (incomingDup || packageDup || toolDup)
        {
            return new AiToolContractGenerationResponse(
                "duplicate",
                "Tool already exists",
                slug,
                null);
        }

        var title = ToTitle(request.ToolIdea, slug);
        var description = $"{title} helps developers run focused transformations with governed execution and clean output.";
        var contractJson = BuildContractJson(slug, title, description);
        return new AiToolContractGenerationResponse("ok", null, slug, contractJson);
    }

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

    private static string ToSlug(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim().ToLowerInvariant();
        var builder = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (char.IsLetterOrDigit(ch))
            {
                builder.Append(ch);
                continue;
            }

            builder.Append('-');
        }

        var collapsed = MultiDashRegex.Replace(builder.ToString(), "-").Trim('-');
        return collapsed;
    }

    private static string ToTitle(string? toolIdea, string fallbackSlug)
    {
        if (string.IsNullOrWhiteSpace(toolIdea))
        {
            return string.Join(' ', fallbackSlug.Split('-', StringSplitOptions.RemoveEmptyEntries).Select(Capitalize));
        }

        return string.Join(' ', ToSlug(toolIdea).Split('-', StringSplitOptions.RemoveEmptyEntries).Select(Capitalize));
    }

    private static string Capitalize(string value)
        => string.IsNullOrWhiteSpace(value) ? value : char.ToUpperInvariant(value[0]) + value[1..];

    private static string BuildContractJson(string slug, string title, string description)
    {
        var payload = new
        {
            contractVersion = "v1",
            tool = new
            {
                slug,
                title,
                description
            },
            runtime = new
            {
                uiMode = "auto",
                complexityTier = 1,
                executionAuthority = "ShadowOnly"
            },
            ui = new
            {
                viewName = "ToolShell"
            },
            seo = new
            {
                title = $"{title} | ToolNexus",
                description
            },
            files = new object[]
            {
                new
                {
                    path = "tool.js",
                    type = "js",
                    content = "import { initUI } from './ui.js';\n\nexport default {\n  mount(container){\n    const ui = initUI(container);\n    return {\n      destroy(){\n        ui.destroy();\n      }\n    };\n  }\n};"
                },
                new
                {
                    path = "ui.js",
                    type = "js",
                    content = "import { execute } from './logic.js';\n\nexport function initUI(container){\n  container.innerHTML = '';\n  const root = document.createElement('div');\n  root.className = 'tn-ai-tool';\n  root.innerHTML = `<div class=\"tn-ai-tool__input\"><textarea data-input></textarea><button data-run>Run</button></div><pre data-output></pre>`;\n  container.appendChild(root);\n\n  const runButton = root.querySelector('[data-run]');\n  const input = root.querySelector('[data-input]');\n  const output = root.querySelector('[data-output]');\n  const onClick = () => { output.textContent = execute(input.value); };\n  runButton.addEventListener('click', onClick);\n\n  return {\n    destroy(){\n      runButton.removeEventListener('click', onClick);\n      root.remove();\n    }\n  };\n}"
                },
                new
                {
                    path = "logic.js",
                    type = "js",
                    content = "export function execute(value){\n  const normalized = String(value ?? '').trim();\n  if (!normalized) return 'Enter input to execute.';\n  return `Processed: ${normalized}`;\n}"
                },
                new
                {
                    path = "template.html",
                    type = "html",
                    content = $"<section class=\"tn-article\">\n  <header><h1>{title}</h1><p>{description}</p></header>\n  <section><h2>Input Area</h2><p>Paste your source payload and click run.</p></section>\n  <section><h2>Action Buttons</h2><p>Use Run to execute and reset to clear.</p></section>\n  <section><h2>Result Panel</h2><p>Output appears in the right panel with execution state.</p></section>\n  <section><h2>Real Example</h2><p>Input: hello world → Output: Processed: hello world.</p></section>\n  <section><h2>How To Use</h2><ol><li>Paste input.</li><li>Click run.</li><li>Copy result.</li></ol></section>\n  <article><h2>Deep Dive</h2><p>When teams build internal workflows, they need a lightweight utility that stays predictable. This tool keeps the experience compact, fast, and maintainable while still fitting the larger execution platform patterns.</p></article>\n</section>"
                },
                new
                {
                    path = "styles.css",
                    type = "css",
                    content = ".tn-ai-tool{display:grid;gap:0.75rem}.tn-ai-tool__input{display:grid;gap:0.5rem}.tn-article h1{margin-bottom:0.5rem}"
                }
            }
        };

        return JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
    }
}
