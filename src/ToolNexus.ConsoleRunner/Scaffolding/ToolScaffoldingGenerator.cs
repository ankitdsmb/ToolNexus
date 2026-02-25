using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace ToolNexus.ConsoleRunner.Scaffolding;

public sealed class ToolScaffoldingGenerator(string workingDirectory)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly string _repoRoot = ResolveRepoRoot(workingDirectory);

    public ToolScaffoldingResult Generate(string toolId, ToolTemplateKind template)
    {
        var normalizedToolId = NormalizeToolId(toolId);
        var pascalName = ToPascalCase(normalizedToolId);
        var title = ToTitle(normalizedToolId);

        EnsureToolDoesNotExist(normalizedToolId);

        var generatedFiles = new List<string>
        {
            UpsertToolManifest(normalizedToolId, title, template),
            WriteWebManifest(normalizedToolId),
            WriteTemplate(normalizedToolId, title, template),
            WriteRuntimeModule(normalizedToolId, template),
            WriteDefaultIcon(normalizedToolId, title),
            WriteExecutionStub(normalizedToolId, pascalName),
            WriteToolTests(normalizedToolId, pascalName),
            WriteToolDocumentation(normalizedToolId, title, template)
        };

        return new ToolScaffoldingResult(normalizedToolId, template.ToName(), generatedFiles);
    }

    private string UpsertToolManifest(string toolId, string title, ToolTemplateKind template)
    {
        var path = Path.Combine(_repoRoot, "tools.manifest.json");
        var rootNode = JsonNode.Parse(File.ReadAllText(path))?.AsObject() ?? new JsonObject();
        var tools = rootNode["tools"] as JsonArray ?? [];

        if (tools.Any(node => string.Equals(node?["slug"]?.GetValue<string>(), toolId, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"Tool '{toolId}' already exists in tools.manifest.json.");
        }

        var entry = new JsonObject
        {
            ["slug"] = toolId,
            ["title"] = title,
            ["category"] = "utility",
            ["actions"] = new JsonArray("run"),
            ["seoTitle"] = $"{title} | ToolNexus",
            ["seoDescription"] = $"Scaffolded {title} tool.",
            ["exampleInput"] = "{}",
            ["clientSafeActions"] = new JsonArray("run"),
            ["runtimeLanguage"] = "dotnet",
            ["executionCapability"] = "standard",
            ["uiMode"] = "auto",
            ["complexityTier"] = 1,
            ["toolRuntimeType"] = "execution",
            ["operationSchema"] = JsonSerializer.SerializeToNode(BuildOperationSchema(template), JsonOptions)
        };

        tools.Add(entry);
        rootNode["tools"] = tools;
        File.WriteAllText(path, rootNode.ToJsonString(JsonOptions) + Environment.NewLine, Encoding.UTF8);
        return ToRelative(path);
    }

    private string WriteWebManifest(string toolId)
    {
        var path = Path.Combine(_repoRoot, "src", "ToolNexus.Web", "App_Data", "tool-manifests", $"{toolId}.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        var payload = new
        {
            slug = toolId,
            viewName = "ToolShell",
            modulePath = $"/js/tools/{toolId}.js",
            templatePath = $"/tool-templates/{toolId}.html",
            dependencies = Array.Empty<string>(),
            styles = new[] { "/css/tools/scaffolded-tool.css" },
            category = "utility",
            uiMode = "auto",
            complexityTier = 1
        };

        File.WriteAllText(path, JsonSerializer.Serialize(payload, JsonOptions) + Environment.NewLine, Encoding.UTF8);
        return ToRelative(path);
    }

    private string WriteTemplate(string toolId, string title, ToolTemplateKind template)
    {
        var path = Path.Combine(_repoRoot, "src", "ToolNexus.Web", "wwwroot", "tool-templates", $"{toolId}.html");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        var descriptor = template switch
        {
            ToolTemplateKind.Structured => "Tier 2 structured template ready for richer operation schemas.",
            ToolTemplateKind.CustomUi => "Tier 3 custom UI starter while still mounted by unified shell.",
            _ => "Tier 1 utility template with unified auto UI."
        };

        var content = $"<section class=\"tool-auto-template scaffold\" data-tool-slug=\"{toolId}\">\n" +
                      $"  <header class=\"scaffold__header\">\n" +
                      $"    <h2>{title}</h2>\n" +
                      $"    <p>{descriptor}</p>\n" +
                      "  </header>\n" +
                      "  <div data-tool-output=\"true\" class=\"scaffold__output\"></div>\n" +
                      "</section>\n";

        File.WriteAllText(path, content, Encoding.UTF8);
        return ToRelative(path);
    }

    private string WriteRuntimeModule(string toolId, ToolTemplateKind template)
    {
        var path = Path.Combine(_repoRoot, "src", "ToolNexus.Web", "wwwroot", "js", "tools", $"{toolId}.js");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        var content = string.Join('\n',
        [
            $"const TOOL_ID = '{toolId}';",
            string.Empty,
            "export const runtimeIdentity = {",
            "  toolId: TOOL_ID,",
            "  uiMode: 'auto',",
            "  complexityTier: 1,",
            "  runtimeLanguage: 'dotnet',",
            "  executionCapability: 'standard',",
            $"  template: '{template.ToName()}'",
            "};",
            string.Empty,
            "export const toolRuntimeType = 'execution';",
            string.Empty,
            "export async function runTool(action, input) {",
            "  if (String(action ?? '').trim().toLowerCase() !== 'run') {",
            "    throw new Error('Unsupported action [' + action + '] for ' + TOOL_ID);",
            "  }",
            "",
            "  return JSON.stringify({ status: 'scaffolded', toolId: TOOL_ID, input }, null, 2);",
            "}",
            string.Empty,
            "window.ToolNexusModules = window.ToolNexusModules || {};",
            "window.ToolNexusModules[TOOL_ID] = { runTool, runtimeIdentity, toolRuntimeType };",
            string.Empty
        ]);

        File.WriteAllText(path, content, Encoding.UTF8);
        return ToRelative(path);
    }

    private string WriteDefaultIcon(string toolId, string title)
    {
        var path = Path.Combine(_repoRoot, "src", "ToolNexus.Web", "wwwroot", "assets", "tools", $"{toolId}.svg");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var content = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"96\" height=\"96\" viewBox=\"0 0 96 96\" role=\"img\" aria-label=\"" + title + "\">\n" +
                      "  <rect width=\"96\" height=\"96\" rx=\"16\" fill=\"#0f172a\" />\n" +
                      "  <path d=\"M24 30h48v8H24zm0 14h48v8H24zm0 14h30v8H24z\" fill=\"#38bdf8\" />\n" +
                      "  <circle cx=\"66\" cy=\"62\" r=\"10\" fill=\"#22d3ee\" />\n" +
                      "</svg>\n";
        File.WriteAllText(path, content, Encoding.UTF8);
        return ToRelative(path);
    }

    private string WriteExecutionStub(string toolId, string pascalName)
    {
        var path = Path.Combine(_repoRoot, "src", "ToolNexus.Infrastructure", "Executors", "Generated", $"{pascalName}ToolExecutor.cs");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        var content = $"using ToolNexus.Application.Abstractions;\n\n" +
                      "namespace ToolNexus.Infrastructure.Executors.Generated;\n\n" +
                      $"public sealed class {pascalName}ToolExecutor : ToolExecutorBase\n" +
                      "{\n" +
                      $"    public override string Slug => \"{toolId}\";\n\n" +
                      "    public override ToolMetadata Metadata { get; } = new(\n" +
                      $"        \"{toolId}\",\n" +
                      $"        \"Scaffolded executor for {toolId}.\",\n" +
                      "        \"utility\",\n" +
                      "        string.Empty,\n" +
                      $"        [\"{toolId}\", \"scaffolded\"]);\n\n" +
                      "    public override IReadOnlyCollection<string> SupportedActions { get; } = [\"run\"];\n\n" +
                      "    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)\n" +
                      "    {\n" +
                      "        if (!string.Equals(action, \"run\", StringComparison.OrdinalIgnoreCase))\n" +
                      "        {\n" +
                      $"            throw new InvalidOperationException($\"Unsupported action '{{action}}' for '{toolId}'.\");\n" +
                      "        }\n\n" +
                      $"        var payload = System.Text.Json.JsonSerializer.Serialize(new {{ status = \"scaffolded\", toolId = \"{toolId}\", input = request.Input }});\n" +
                      "        return Task.FromResult(ToolResult.Ok(payload));\n" +
                      "    }\n" +
                      "}\n";

        File.WriteAllText(path, content, Encoding.UTF8);
        return ToRelative(path);
    }

    private string WriteToolTests(string toolId, string pascalName)
    {
        var path = Path.Combine(_repoRoot, "tests", "ToolNexus.Infrastructure.Tests", "Generated", $"{pascalName}ToolScaffoldTests.cs");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        var content = "using System.Text.Json;\n" +
                      "using ToolNexus.Infrastructure.Executors.Generated;\n\n" +
                      "namespace ToolNexus.Infrastructure.Tests.Generated;\n\n" +
                      $"public sealed class {pascalName}ToolScaffoldTests\n" +
                      "{\n" +
                      "    [Fact]\n" +
                      "    public async Task ExecutionTest_RunAction_ReturnsScaffoldPayload()\n" +
                      "    {\n" +
                      $"        var executor = new {pascalName}ToolExecutor();\n" +
                      "        var result = await executor.ExecuteAsync(new ToolNexus.Application.Abstractions.ToolRequest(\"run\", \"{}\"));\n" +
                      "        Assert.True(result.Success);\n" +
                      "        Assert.Contains(\"scaffolded\", result.Output, StringComparison.OrdinalIgnoreCase);\n" +
                      "    }\n\n" +
                      "    [Fact]\n" +
                      "    public void RuntimeMountTest_WebManifest_UsesUnifiedAutoDefaults()\n" +
                      "    {\n" +
                      $"        var path = Path.Combine(\"src\", \"ToolNexus.Web\", \"App_Data\", \"tool-manifests\", \"{toolId}.json\");\n" +
                      "        using var doc = JsonDocument.Parse(File.ReadAllText(path));\n" +
                      "        Assert.Equal(\"ToolShell\", doc.RootElement.GetProperty(\"viewName\").GetString());\n" +
                      "        Assert.Equal(\"auto\", doc.RootElement.GetProperty(\"uiMode\").GetString());\n" +
                      "        Assert.Equal(1, doc.RootElement.GetProperty(\"complexityTier\").GetInt32());\n" +
                      "    }\n\n" +
                      "    [Fact]\n" +
                      "    public void ManifestValidationTest_PlatformManifest_HasRuntimeGovernanceDefaults()\n" +
                      "    {\n" +
                      "        using var doc = JsonDocument.Parse(File.ReadAllText(\"tools.manifest.json\"));\n" +
                      "        var tool = doc.RootElement.GetProperty(\"tools\").EnumerateArray().First(x => string.Equals(x.GetProperty(\"slug\").GetString(), \"" + toolId + "\", StringComparison.OrdinalIgnoreCase));\n" +
                      "        Assert.Equal(\"dotnet\", tool.GetProperty(\"runtimeLanguage\").GetString());\n" +
                      "        Assert.Equal(\"standard\", tool.GetProperty(\"executionCapability\").GetString());\n" +
                      "        Assert.Equal(\"execution\", tool.GetProperty(\"toolRuntimeType\").GetString());\n" +
                      "    }\n" +
                      "}\n";

        File.WriteAllText(path, content, Encoding.UTF8);
        return ToRelative(path);
    }

    private string WriteToolDocumentation(string toolId, string title, ToolTemplateKind template)
    {
        var path = Path.Combine(_repoRoot, "docs", "tools", $"{toolId}.md");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        var content = $"# {title}\n\n" +
                      "## Scaffold Profile\n" +
                      $"- Tool Id: `{toolId}`\n" +
                      $"- Template: `{template.ToName()}`\n" +
                      "- uiMode: `auto`\n" +
                      "- complexityTier: `1`\n" +
                      "- runtimeLanguage: `dotnet`\n" +
                      "- executionCapability: `standard`\n\n" +
                      "## Generated Assets\n" +
                      $"- Runtime module: `/js/tools/{toolId}.js`\n" +
                      $"- Runtime template: `/tool-templates/{toolId}.html`\n" +
                      $"- Runtime manifest: `src/ToolNexus.Web/App_Data/tool-manifests/{toolId}.json`\n" +
                      $"- Server stub: `src/ToolNexus.Infrastructure/Executors/Generated/{ToPascalCase(toolId)}ToolExecutor.cs`\n" +
                      $"- Tests: `tests/ToolNexus.Infrastructure.Tests/Generated/{ToPascalCase(toolId)}ToolScaffoldTests.cs`\n\n" +
                      "## Safety Notes\n" +
                      "- Scaffolded tools still flow through manifest governance (`IToolManifestGovernance`).\n" +
                      "- Execution capability remains `standard` and does not bypass policy registry.\n" +
                      "- Authority selection is unchanged and still resolved by `IExecutionAuthorityResolver`.\n";

        File.WriteAllText(path, content, Encoding.UTF8);
        return ToRelative(path);
    }

    private void EnsureToolDoesNotExist(string toolId)
    {
        var executorPath = Path.Combine(_repoRoot, "src", "ToolNexus.Infrastructure", "Executors", "Generated", $"{ToPascalCase(toolId)}ToolExecutor.cs");
        if (File.Exists(executorPath))
        {
            throw new InvalidOperationException($"Tool '{toolId}' already has a generated executor stub.");
        }
    }

    private static object BuildOperationSchema(ToolTemplateKind template)
    {
        return new
        {
            type = "object",
            description = "Auto-generated operation schema for scaffolded tool.",
            template = template.ToName(),
            tier = template.ToComplexityTier(),
            required = new[] { "input" },
            properties = new
            {
                input = new { type = "string", title = "Input", ui = "textarea" },
                mode = new { type = "string", @default = "run", @enum = new[] { "run" } }
            }
        };
    }

    private static string ResolveRepoRoot(string start)
    {
        var current = new DirectoryInfo(start);
        while (current is not null)
        {
            if (File.Exists(Path.Combine(current.FullName, "ToolNexus.sln")))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        throw new InvalidOperationException("Unable to locate ToolNexus.sln from current directory.");
    }

    private static string NormalizeToolId(string toolId)
    {
        var normalized = Regex.Replace(toolId.Trim().ToLowerInvariant(), "[^a-z0-9-]", "-");
        normalized = Regex.Replace(normalized, "-+", "-").Trim('-');

        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new InvalidOperationException("toolId must contain at least one alphanumeric character.");
        }

        return normalized;
    }

    private static string ToPascalCase(string value)
    {
        return string.Concat(value.Split('-', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
    }

    private static string ToTitle(string value)
    {
        return string.Join(' ', value.Split('-', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
    }

    private string ToRelative(string absolutePath)
    {
        return Path.GetRelativePath(_repoRoot, absolutePath).Replace('\\', '/');
    }
}

public sealed record ToolScaffoldingResult(string ToolId, string TemplateName, IReadOnlyCollection<string> GeneratedFiles);
