using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.IntegrationTests;

public sealed class ManifestAndSitemapServiceTests
{
    [Fact, Trait("Category", "Unit"), Trait("Category", "SEO")]
    public void ManifestService_LoadsTools_AndCategories_CaseInsensitive()
    {
        var path = Path.GetTempFileName();
        File.WriteAllText(path, """
        {"tools":[{"slug":"a","title":"A","category":"json","actions":["x"],"seoTitle":"t","seoDescription":"d","exampleInput":"e"},{"slug":"b","title":"B","category":"JSON","actions":["x"],"seoTitle":"t","seoDescription":"d","exampleInput":"e"}]}
        """);

        try
        {
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ManifestPath"] = path }).Build();
            var service = new ManifestService(new FakeEnv(Directory.GetCurrentDirectory()), config);

            Assert.Equal(2, service.GetAllTools().Count);
            Assert.Single(service.GetAllCategories());
            Assert.NotNull(service.GetBySlug("A"));
            Assert.True(service.CategoryExists("json"));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact, Trait("Category", "Unit"), Trait("Category", "SEO")]
    public void SitemapService_BuildsEscapedSitemap()
    {
        var manifest = new StubManifestService();
        var sut = new SitemapService(manifest, new FixedClock(new DateTime(2024, 1, 2, 0, 0, 0, DateTimeKind.Utc)));

        var xml = sut.BuildSitemap("https://example.com");

        Assert.Contains("https://example.com/tools/c%23", xml, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("<lastmod>2024-01-02</lastmod>", xml);
        Assert.Contains("&amp;", xml);
    }

    private sealed class StubManifestService : IManifestService
    {
        public IReadOnlyCollection<ToolNexus.Web.Models.ToolDefinition> GetAllTools() =>
        [
            new() { Slug = "json", Title = "t", Category = "cat", Actions = ["a"], SeoTitle = "x", SeoDescription = "x", ExampleInput = "x" },
            new() { Slug = "a&b", Title = "t", Category = "cat", Actions = ["a"], SeoTitle = "x", SeoDescription = "x", ExampleInput = "x" }
        ];

        public IReadOnlyCollection<string> GetAllCategories() => ["cat", "c#"];
        public ToolNexus.Web.Models.ToolDefinition? GetBySlug(string slug) => null;
        public IReadOnlyCollection<ToolNexus.Web.Models.ToolDefinition> GetByCategory(string category) => [];
        public bool CategoryExists(string category) => false;
    }

    private sealed class FixedClock(DateTime utcNow) : IClock
    {
        public DateTime UtcNow => utcNow;
    }

    private sealed class FakeEnv(string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = root;
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
