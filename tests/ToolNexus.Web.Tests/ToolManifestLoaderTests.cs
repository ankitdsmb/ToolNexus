using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Tests;

public sealed class ToolManifestLoaderTests
{
    [Fact]
    public void LoadAll_LoadsValidManifests()
    {
        using var fixture = new ManifestFixture();
        fixture.WriteManifest("json-formatter.json", """
        {
          "slug": "json-formatter",
          "viewName": "JsonFormatter",
          "category": ""
        }
        """);

        var loader = fixture.CreateLoader();

        var manifests = loader.LoadAll();

        var manifest = Assert.Single(manifests);
        Assert.Equal("json-formatter", manifest.Slug);
        Assert.Equal("JsonFormatter", manifest.ViewName);
    }

    [Fact]
    public void LoadAll_IgnoresInvalidJsonAndInvalidShape()
    {
        using var fixture = new ManifestFixture();
        fixture.WriteManifest("valid.json", """
        {
          "slug": "json-formatter",
          "viewName": "JsonFormatter",
          "category": ""
        }
        """);
        fixture.WriteManifest("broken.json", "{ this is not json }");
        fixture.WriteManifest("missing-fields.json", """
        {
          "slug": "missing-view"
        }
        """);

        var loader = fixture.CreateLoader();

        var manifests = loader.LoadAll();

        var manifest = Assert.Single(manifests);
        Assert.Equal("json-formatter", manifest.Slug);
    }

    [Fact]
    public void LoadAll_DuplicateSlug_ThrowsClearError()
    {
        using var fixture = new ManifestFixture();
        fixture.WriteManifest("tool-a.json", """
        {
          "slug": "json-formatter",
          "viewName": "JsonFormatter",
          "category": ""
        }
        """);
        fixture.WriteManifest("tool-b.json", """
        {
          "slug": "JSON-FORMATTER",
          "viewName": "SomeOtherView",
          "category": ""
        }
        """);

        var loader = fixture.CreateLoader();

        var ex = Assert.Throws<InvalidOperationException>(() => loader.LoadAll());
        Assert.Contains("Duplicate tool manifest slug detected", ex.Message);
    }

    [Fact]
    public void RegistryAndResolver_DiscoverTemporaryManifest_WithoutCodeChanges()
    {
        using var fixture = new ManifestFixture();
        fixture.WriteManifest("example-tool.json", """
        {
          "slug": "example-tool",
          "viewName": "ExampleTool",
          "category": "custom"
        }
        """);

        var registry = new ToolRegistryService(fixture.CreateLoader());
        var resolver = new ToolViewResolver(registry);

        var descriptor = registry.GetBySlug("example-tool");

        Assert.NotNull(descriptor);
        Assert.Equal("ExampleTool", resolver.ResolveViewName("example-tool"));
    }

    private sealed class ManifestFixture : IDisposable
    {
        private readonly string rootPath = Path.Combine(Path.GetTempPath(), $"toolnexus-manifest-tests-{Guid.NewGuid():N}");

        public ManifestFixture()
        {
            Directory.CreateDirectory(ManifestDirectory);
        }

        private string ManifestDirectory => Path.Combine(rootPath, "App_Data", "tool-manifests");

        public void WriteManifest(string name, string content)
        {
            File.WriteAllText(Path.Combine(ManifestDirectory, name), content);
        }

        public ToolManifestLoader CreateLoader() => new(NullLogger<ToolManifestLoader>.Instance, new StubHostEnvironment(rootPath));

        public void Dispose()
        {
            if (Directory.Exists(rootPath))
            {
                Directory.Delete(rootPath, recursive: true);
            }
        }
    }

    private sealed class StubHostEnvironment(string contentRootPath) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "ToolNexus.Web.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = contentRootPath;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
