using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AiToolPackageImportService(
    IAiToolPackageRepository repository,
    IToolDefinitionService toolDefinitionService,
    ILogger<AiToolPackageImportService> logger) : IAiToolPackageImportService
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
            return new AiToolContractGenerationResponse("duplicate", "Tool already exists", slug, null);
        }

        var title = ToTitle(request.ToolIdea, slug);
        var description = $"{title} helps developers run focused transformations with governed execution and clean output.";
        var contractJson = BuildContractJson(slug, title, description);
        logger.LogInformation("ai_import_contract_generated slug={Slug} correlationId={CorrelationId} tenantId={TenantId}", slug, request.CorrelationId, request.TenantId);
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

    public Task<AiToolPackageImportValidationResult> ValidateAsync(string jsonPayload, CancellationToken cancellationToken)
        => ValidateCoreAsync(jsonPayload, cancellationToken, checkDuplicates: true);

    private async Task<AiToolPackageImportValidationResult> ValidateCoreAsync(string jsonPayload, CancellationToken cancellationToken, bool checkDuplicates)
    {
        var errors = new List<string>();
        var normalizedPayload = jsonPayload ?? string.Empty;
        var payloadBytes = Encoding.UTF8.GetByteCount(normalizedPayload);
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

            if (!Regex.IsMatch(slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
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

            if (checkDuplicates && !string.IsNullOrWhiteSpace(slug))
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

        var created = await repository.CreateAsync(validation.Contract, request.CorrelationId, request.TenantId, cancellationToken);
        logger.LogInformation("ai_import_draft_created slug={Slug} correlationId={CorrelationId} tenantId={TenantId} approvalStatus={ApprovalStatus}", created.Slug, request.CorrelationId, request.TenantId, created.ApprovalStatus);
        return created;
    }

    public async Task<AiToolPackageContract?> GetContractBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var record = await repository.GetBySlugAsync(slug.Trim().ToLowerInvariant(), cancellationToken);
        if (record is null)
        {
            return null;
        }

        var validation = await ValidateRecordAsync(record, cancellationToken, strictDuplicateCheck: false);
        return validation.Contract;
    }

    public async Task<AiRuntimeInspectionResponse?> InspectRuntimeAsync(string slug, CancellationToken cancellationToken)
    {
        var contract = await GetContractBySlugAsync(slug, cancellationToken);
        if (contract is null)
        {
            return null;
        }

        var runtimeNode = JsonNode.Parse(contract.Runtime)?.AsObject();
        var uiNode = JsonNode.Parse(contract.Ui)?.AsObject();
        var runtimeLanguage = runtimeNode?["language"]?.GetValue<string>() ?? "auto";
        var usesToolShell = string.Equals(uiNode?["viewName"]?.GetValue<string>(), "ToolShell", StringComparison.OrdinalIgnoreCase);
        var hasTemplate = contract.Files.Any(f => string.Equals(f.Path, "template.html", StringComparison.OrdinalIgnoreCase));
        var hasStyles = contract.Files.Any(f => f.Type == "css");
        var hasLogicModule = contract.Files.Any(f => string.Equals(f.Path, "logic.js", StringComparison.OrdinalIgnoreCase));
        var findings = new List<string>();

        if (!usesToolShell)
        {
            findings.Add("UI viewName is not ToolShell and may violate immutable workspace shell requirements.");
        }

        if (!hasTemplate)
        {
            findings.Add("template.html is missing; generated documentation and right-panel guidance are reduced.");
        }

        if (!hasLogicModule)
        {
            findings.Add("logic.js is missing; execution behavior may be embedded in UI module.");
        }

        if (string.Equals(runtimeLanguage, "auto", StringComparison.OrdinalIgnoreCase))
        {
            findings.Add("Runtime language is auto; runtime authority resolution remains server-managed.");
        }

        logger.LogInformation("ai_import_runtime_inspected slug={Slug} runtime={Runtime} findings={FindingCount}", contract.Slug, runtimeLanguage, findings.Count);
        return new AiRuntimeInspectionResponse(contract.Slug, runtimeLanguage, usesToolShell, hasTemplate, hasStyles, hasLogicModule, findings);
    }

    public async Task<AiContractSuggestionsResponse?> GetContractSuggestionsAsync(string slug, CancellationToken cancellationToken)
    {
        var contract = await GetContractBySlugAsync(slug, cancellationToken);
        if (contract is null)
        {
            return null;
        }

        var suggestions = new List<AiContractSuggestion>();
        var runtimeNode = JsonNode.Parse(contract.Runtime)?.AsObject();
        var uiNode = JsonNode.Parse(contract.Ui)?.AsObject();

        if (!string.Equals(uiNode?["viewName"]?.GetValue<string>(), "ToolShell", StringComparison.OrdinalIgnoreCase))
        {
            suggestions.Add(new AiContractSuggestion("ui-view", "high", "Use ToolShell to keep immutable platform layout.", "/ui/viewName", "ToolShell"));
        }

        if (!string.Equals(runtimeNode?["executionAuthority"]?.GetValue<string>(), "ShadowOnly", StringComparison.OrdinalIgnoreCase))
        {
            suggestions.Add(new AiContractSuggestion("authority", "high", "Set execution authority to ShadowOnly for draft safety.", "/runtime/executionAuthority", "ShadowOnly"));
        }

        if (contract.Files.All(f => !string.Equals(f.Path, "template.html", StringComparison.OrdinalIgnoreCase)))
        {
            suggestions.Add(new AiContractSuggestion("template-file", "medium", "Add template.html for generated capability guidance content.", "/files/-", new { path = "template.html", type = "html", content = "<section><h1>Generated capability</h1></section>" }));
        }

        if (contract.Files.All(f => !string.Equals(f.Path, "styles.css", StringComparison.OrdinalIgnoreCase)))
        {
            suggestions.Add(new AiContractSuggestion("styles-file", "low", "Add styles.css for consistent visual baseline.", "/files/-", new { path = "styles.css", type = "css", content = ".tn-ai-tool{display:grid;gap:0.75rem;}" }));
        }

        logger.LogInformation("ai_import_contract_suggestions slug={Slug} suggestions={SuggestionCount}", contract.Slug, suggestions.Count);
        return new AiContractSuggestionsResponse(contract.Slug, suggestions);
    }

    public async Task<AiToolPackageRecord> ApplyJsonPatchAsync(string slug, AiJsonPatchUpdateRequest request, CancellationToken cancellationToken)
    {
        var record = await repository.GetBySlugAsync(slug.Trim().ToLowerInvariant(), cancellationToken)
            ?? throw new InvalidOperationException("AI tool package not found.");

        if (record.ApprovalStatus == AiToolPackageApprovalStatus.Approved)
        {
            throw new InvalidOperationException("Approved package cannot be patched. Create a new draft revision.");
        }

        var node = JsonNode.Parse(record.JsonPayload) ?? throw new InvalidOperationException("Stored JSON payload is invalid.");
        foreach (var operation in request.Operations)
        {
            ApplyPatch(node, operation);
        }

        var updatedJson = node.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        var validation = await ValidateRecordAsync(record with { JsonPayload = updatedJson }, cancellationToken, strictDuplicateCheck: false);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException($"Patch application produced invalid contract: {string.Join("; ", validation.Errors)}");
        }

        var updated = await repository.UpdateAsync(record.Id, updatedJson, record.Version, request.CorrelationId, request.TenantId, cancellationToken);
        logger.LogInformation("ai_import_patch_applied slug={Slug} ops={OperationCount} correlationId={CorrelationId} tenantId={TenantId}", updated.Slug, request.Operations.Count, request.CorrelationId, request.TenantId);
        return updated;
    }

    public async Task<AiToolPackageRecord> SubmitForApprovalAsync(string slug, AiApprovalSubmissionRequest request, CancellationToken cancellationToken)
    {
        var record = await repository.GetBySlugAsync(slug.Trim().ToLowerInvariant(), cancellationToken)
            ?? throw new InvalidOperationException("AI tool package not found.");

        if (record.ApprovalStatus == AiToolPackageApprovalStatus.Approved)
        {
            throw new InvalidOperationException("Package is already approved.");
        }

        logger.LogInformation("ai_import_approval_submitted slug={Slug} correlationId={CorrelationId} tenantId={TenantId}", record.Slug, request.CorrelationId, request.TenantId);
        return await repository.SetApprovalStateAsync(
            record.Id,
            AiToolPackageApprovalStatus.PendingApproval,
            request.Comment,
            null,
            null,
            record.Version,
            request.CorrelationId,
            request.TenantId,
            cancellationToken);
    }

    public async Task<AiToolPackageRecord> DecideApprovalAsync(string slug, AiApprovalDecisionRequest request, CancellationToken cancellationToken)
    {
        var record = await repository.GetBySlugAsync(slug.Trim().ToLowerInvariant(), cancellationToken)
            ?? throw new InvalidOperationException("AI tool package not found.");

        if (record.ApprovalStatus != AiToolPackageApprovalStatus.PendingApproval)
        {
            throw new InvalidOperationException("Package must be pending approval before decision.");
        }

        var status = request.Approve ? AiToolPackageApprovalStatus.Approved : AiToolPackageApprovalStatus.Rejected;
        DateTime? approvedAt = request.Approve ? DateTime.UtcNow : null;

        logger.LogInformation("ai_import_approval_submitted slug={Slug} correlationId={CorrelationId} tenantId={TenantId}", record.Slug, request.CorrelationId, request.TenantId);
        logger.LogInformation("ai_import_approval_decided slug={Slug} decision={Decision} decidedBy={DecidedBy} correlationId={CorrelationId} tenantId={TenantId}", record.Slug, status, request.DecidedBy, request.CorrelationId, request.TenantId);
        return await repository.SetApprovalStateAsync(
            record.Id,
            status,
            request.Comment,
            request.DecidedBy,
            approvedAt,
            record.Version,
            request.CorrelationId,
            request.TenantId,
            cancellationToken);
    }

    private async Task<AiToolPackageImportValidationResult> ValidateRecordAsync(AiToolPackageRecord record, CancellationToken cancellationToken, bool strictDuplicateCheck)
    {
        var result = await ValidateCoreAsync(record.JsonPayload, cancellationToken, checkDuplicates: strictDuplicateCheck);
        if (!strictDuplicateCheck && !result.IsValid)
        {
            var filtered = result.Errors.Where(x => !x.Contains("already exists", StringComparison.OrdinalIgnoreCase)).ToArray();
            return filtered.Length == 0
                ? result with { IsValid = true, Errors = Array.Empty<string>() }
                : result with { Errors = filtered, IsValid = false };
        }

        return result;
    }

    private static void ApplyPatch(JsonNode root, JsonPatchOperation operation)
    {
        if (!operation.Path.StartsWith('/'))
        {
            throw new InvalidOperationException($"Patch path '{operation.Path}' must start with '/'.");
        }

        var segments = operation.Path.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.Replace("~1", "/").Replace("~0", "~"))
            .ToArray();
        if (segments.Length == 0)
        {
            throw new InvalidOperationException("Root patch operations are not supported.");
        }

        JsonNode current = root;
        for (var i = 0; i < segments.Length - 1; i++)
        {
            var segment = segments[i];
            current = current switch
            {
                JsonObject obj when obj[segment] is not null => obj[segment]!,
                JsonArray arr when int.TryParse(segment, out var index) && index >= 0 && index < arr.Count => arr[index]!,
                _ => throw new InvalidOperationException($"Patch path segment '{segment}' does not exist.")
            };
        }

        var leaf = segments[^1];
        var valueNode = operation.Value is null ? null : JsonNode.Parse(operation.Value.Value.GetRawText());

        switch (operation.Op.ToLowerInvariant())
        {
            case "add":
            case "replace":
                if (current is JsonObject obj)
                {
                    obj[leaf] = valueNode;
                    return;
                }

                if (current is JsonArray arr)
                {
                    if (leaf == "-")
                    {
                        arr.Add(valueNode);
                        return;
                    }

                    if (!int.TryParse(leaf, out var index) || index < 0 || index > arr.Count)
                    {
                        throw new InvalidOperationException($"Patch index '{leaf}' is invalid.");
                    }

                    if (operation.Op.Equals("add", StringComparison.OrdinalIgnoreCase) && index == arr.Count)
                    {
                        arr.Add(valueNode);
                    }
                    else
                    {
                        arr[index] = valueNode;
                    }

                    return;
                }

                throw new InvalidOperationException("Patch target is neither object nor array.");

            case "remove":
                if (current is JsonObject removeObj)
                {
                    removeObj.Remove(leaf);
                    return;
                }

                if (current is JsonArray removeArr && int.TryParse(leaf, out var removeIndex) && removeIndex >= 0 && removeIndex < removeArr.Count)
                {
                    removeArr.RemoveAt(removeIndex);
                    return;
                }

                throw new InvalidOperationException($"Cannot remove path '{operation.Path}'.");

            default:
                throw new InvalidOperationException($"Patch operation '{operation.Op}' is not supported.");
        }
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
        => content.Contains("eval(", StringComparison.OrdinalIgnoreCase)
           || content.Contains("window.location =", StringComparison.OrdinalIgnoreCase)
           || content.Contains("window.location.href =", StringComparison.OrdinalIgnoreCase);

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
            builder.Append(char.IsLetterOrDigit(ch) ? ch : '-');
        }

        return MultiDashRegex.Replace(builder.ToString(), "-").Trim('-');
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
                new { path = "tool.js", type = "js", content = "import { initUI } from './ui.js';\n\nexport default {\n  mount(container){\n    const ui = initUI(container);\n    return {\n      destroy(){\n        ui.destroy();\n      }\n    };\n  }\n};" },
                new { path = "ui.js", type = "js", content = "import { execute } from './logic.js';\n\nexport function initUI(container){\n  container.innerHTML = '';\n  const root = document.createElement('div');\n  root.className = 'tn-ai-tool';\n  root.innerHTML = `<div class=\"tn-ai-tool__input\"><textarea data-input></textarea><button data-run>Run</button></div><pre data-output></pre>`;\n  container.appendChild(root);\n\n  const runButton = root.querySelector('[data-run]');\n  const input = root.querySelector('[data-input]');\n  const output = root.querySelector('[data-output]');\n  const onClick = () => { output.textContent = execute(input.value); };\n  runButton.addEventListener('click', onClick);\n\n  return { destroy(){ runButton.removeEventListener('click', onClick); root.remove(); } };\n}" },
                new { path = "logic.js", type = "js", content = "export function execute(value){\n  const normalized = String(value ?? '').trim();\n  if (!normalized) return 'Enter input to execute.';\n  return `Processed: ${normalized}`;\n}" },
                new { path = "template.html", type = "html", content = $"<section class=\"tn-article\"><header><h1>{title}</h1><p>{description}</p></header></section>" },
                new { path = "styles.css", type = "css", content = ".tn-ai-tool{display:grid;gap:0.75rem}.tn-ai-tool__input{display:grid;gap:0.5rem}" }
            }
        };

        return JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
    }
}
