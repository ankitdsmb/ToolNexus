using ToolNexus.Application.Services;
using ToolNexus.Domain;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Tools.Json.Tests;

public sealed class OrchestrationAndSitemapTests
{
    [Fact]
    public void SelectToolByCapability_ReturnsMatchingExecutor()
    {
        var jsonExecutor = new FakeToolExecutor(
            "json-formatter",
            new ToolMetadata("JSON Formatter", "Format JSON", "json", "{}", ["json", "formatting"]));
        var xmlExecutor = new FakeToolExecutor(
            "xml-formatter",
            new ToolMetadata("XML Formatter", "Format XML", "xml", "<root />", ["xml", "formatting"]));

        var service = new OrchestrationService([jsonExecutor, xmlExecutor]);

        var selected = service.SelectToolByCapability("  XML ");

        Assert.NotNull(selected);
        Assert.Equal("xml-formatter", selected!.Slug);
    }

    [Fact]
    public void BuildSitemap_IncludesRoutesFromManifest()
    {
        var manifestService = new FakeManifestService(
            [
                new ToolDefinition
                {
                    Slug = "json-formatter",
                    Title = "JSON Formatter",
                    Category = "json",
                    Actions = ["format"],
                    SeoTitle = "JSON Formatter | ToolNexus",
                    SeoDescription = "Format JSON.",
                    ExampleInput = "{}"
                },
                new ToolDefinition
                {
                    Slug = "xml-formatter",
                    Title = "XML Formatter",
                    Category = "xml",
                    Actions = ["format"],
                    SeoTitle = "XML Formatter | ToolNexus",
                    SeoDescription = "Format XML.",
                    ExampleInput = "<root />"
                }
            ]);

        var service = new SitemapService(manifestService);

        var sitemap = service.BuildSitemap("https://toolnexus.dev");

        Assert.Contains("<loc>https://toolnexus.dev/</loc>", sitemap);
        Assert.Contains("<loc>https://toolnexus.dev/tools</loc>", sitemap);
        Assert.Contains("<loc>https://toolnexus.dev/tools/json</loc>", sitemap);
        Assert.Contains("<loc>https://toolnexus.dev/tools/xml</loc>", sitemap);
        Assert.Contains("<loc>https://toolnexus.dev/tools/json-formatter</loc>", sitemap);
        Assert.Contains("<loc>https://toolnexus.dev/tools/xml-formatter</loc>", sitemap);
    }

    private sealed class FakeToolExecutor(string slug, ToolMetadata metadata) : IToolExecutor
    {
        public string Slug { get; } = slug;
        public ToolMetadata Metadata { get; } = metadata;
        public IReadOnlyCollection<string> SupportedActions { get; } = ["run"];

        public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
            => Task.FromResult(ToolResult.Ok(request.Input));
    }

    private sealed class FakeManifestService(IReadOnlyCollection<ToolDefinition> tools) : IManifestService
    {
        public IReadOnlyCollection<ToolDefinition> GetAllTools() => tools;

        public IReadOnlyCollection<string> GetAllCategories() => tools
            .Select(x => x.Category)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

        public ToolDefinition? GetBySlug(string slug) => tools.FirstOrDefault(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

        public IReadOnlyCollection<ToolDefinition> GetByCategory(string category) =>
            tools.Where(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

        public bool CategoryExists(string category) =>
            tools.Any(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
    }
}
