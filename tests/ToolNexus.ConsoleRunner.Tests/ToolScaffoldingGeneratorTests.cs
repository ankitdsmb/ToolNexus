using Xunit;
using System.Text.Json;
using ToolNexus.ConsoleRunner.Scaffolding;

namespace ToolNexus.ConsoleRunner.Tests;

public sealed class ToolScaffoldingGeneratorTests
{
    [Fact]
    public void Generate_CreatesManifestRuntimeMetadataAndTests()
    {
        var repo = CreateTemporaryRepo();
        var generator = new ToolScaffoldingGenerator(repo);

        var result = generator.Generate("sample-tool", ToolTemplateKind.Structured);

        Assert.Equal("sample-tool", result.ToolId);
        Assert.Contains(result.GeneratedFiles, path => path.EndsWith("docs/tools/sample-tool.md", StringComparison.Ordinal));

        var manifestPath = Path.Combine(repo, "tools.manifest.json");
        using var manifestDoc = JsonDocument.Parse(File.ReadAllText(manifestPath));
        var tool = manifestDoc.RootElement.GetProperty("tools").EnumerateArray().Single();

        Assert.Equal("dotnet", tool.GetProperty("runtimeLanguage").GetString());
        Assert.Equal("standard", tool.GetProperty("executionCapability").GetString());
        Assert.Equal("auto", tool.GetProperty("uiMode").GetString());
        Assert.Equal(1, tool.GetProperty("complexityTier").GetInt32());

        var generatedTestPath = Path.Combine(repo, "tests", "ToolNexus.Infrastructure.Tests", "Generated", "SampleToolToolScaffoldTests.cs");
        Assert.True(File.Exists(generatedTestPath));
    }

    private static string CreateTemporaryRepo()
    {
        var root = Path.Combine(Path.GetTempPath(), "toolnexus-scaffold-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);

        File.WriteAllText(Path.Combine(root, "ToolNexus.sln"), "");
        File.WriteAllText(Path.Combine(root, "tools.manifest.json"), "{\"tools\":[]}");

        Directory.CreateDirectory(Path.Combine(root, "src", "ToolNexus.Web", "App_Data", "tool-manifests"));
        Directory.CreateDirectory(Path.Combine(root, "src", "ToolNexus.Web", "wwwroot", "tool-templates"));
        Directory.CreateDirectory(Path.Combine(root, "src", "ToolNexus.Web", "wwwroot", "js", "tools"));
        Directory.CreateDirectory(Path.Combine(root, "src", "ToolNexus.Web", "wwwroot", "assets", "tools"));
        Directory.CreateDirectory(Path.Combine(root, "src", "ToolNexus.Infrastructure", "Executors", "Generated"));
        Directory.CreateDirectory(Path.Combine(root, "tests", "ToolNexus.Infrastructure.Tests", "Generated"));
        Directory.CreateDirectory(Path.Combine(root, "docs", "tools"));

        return root;
    }
}
