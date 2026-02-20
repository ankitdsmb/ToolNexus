using AppToolDescriptor = ToolNexus.Application.Models.ToolDescriptor;
using WebToolManifest = ToolNexus.Web.Services.ToolManifest;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Controllers;
using ToolNexus.Web.Models;
using ToolNexus.Web.Options;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Tests;

public sealed class ToolShellSeoContractTests
{
    [Fact]
    public async Task Segment_BuildsSchemaMetaAndInternalLinks_ForSsrSeoContract()
    {
        var descriptor = new AppToolDescriptor
        {
            Slug = "json-formatter",
            Title = "JSON Formatter",
            Category = "formatting",
            SeoTitle = "JSON Formatter Tool",
            SeoDescription = "Format and validate JSON payloads.",
            Actions = ["format"],
            ExampleInput = "{\"a\":1}"
        };

        var content = new ToolContent
        {
            Id = 1,
            Slug = descriptor.Slug,
            Title = descriptor.Title,
            SeoTitle = "JSON Formatter - SSR",
            SeoDescription = "SSR description",
            Intro = "Short intro",
            LongDescription = "Long description",
            Keywords = "json,formatter",
            Features = ["Syntax-safe formatting"],
            Steps = [new ToolStep { Id = 1, Slug = descriptor.Slug, Title = "Paste", Description = "Paste payload", SortOrder = 0 }],
            Examples = [new ToolExample { Id = 1, Slug = descriptor.Slug, Title = "Beautify", Input = "{}", Output = "{\n}\n", SortOrder = 0 }],
            Faq = [new ToolFaq { Id = 1, Slug = descriptor.Slug, Question = "Can it validate?", Answer = "Yes", SortOrder = 0 }],
            RelatedTools = [new ToolRelated { Id = 1, Slug = descriptor.Slug, RelatedSlug = "yaml-to-json", SortOrder = 0 }],
            UseCases = ["Debug API payloads"]
        };

        var controller = BuildController(descriptor, content,
        [
            descriptor,
            new AppToolDescriptor { Slug = "yaml-to-json", Title = "YAML to JSON", Category = "formatting", SeoTitle = "YAML", SeoDescription = "desc", Actions = ["convert"], ExampleInput = "a: 1" },
            new AppToolDescriptor { Slug = "xml-formatter", Title = "XML Formatter", Category = "formatting", SeoTitle = "XML", SeoDescription = "desc", Actions = ["format"], ExampleInput = "<a />" }
        ]);

        var result = await controller.Segment(descriptor.Slug, CancellationToken.None);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ToolPageViewModel>(view.Model);

        Assert.NotEmpty(model.RelatedTools);
        Assert.NotEmpty(model.SameCategoryTools);
        Assert.NotEmpty(model.NextTools);
        Assert.Contains("/tools/json-formatter", model.Seo.CanonicalUrl);

        var json = JsonSerializer.Deserialize<JsonElement>(model.Seo.JsonLd);
        Assert.Equal(JsonValueKind.Array, json.ValueKind);
        Assert.Contains(json.EnumerateArray(), node => node.TryGetProperty("@type", out var type) && type.GetString() == "SoftwareApplication");
        Assert.Contains(json.EnumerateArray(), node => node.TryGetProperty("@type", out var type) && type.GetString() == "BreadcrumbList");
        Assert.Contains(json.EnumerateArray(), node => node.TryGetProperty("@type", out var type) && type.GetString() == "FAQPage");
    }

    [Fact]
    public void ToolShell_ViewContainsRequiredSsrSectionsAndSingleH1Contract()
    {
        var viewPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "ToolNexus.Web", "Views", "Tools", "ToolShell.cshtml");
        var viewSource = File.ReadAllText(Path.GetFullPath(viewPath));

        Assert.Equal(1, CountOccurrences(viewSource, "<h1>"));
        Assert.Contains("<h2>Overview</h2>", viewSource);
        Assert.Contains("<h2>Features</h2>", viewSource);
        Assert.Contains("<h2>How to use</h2>", viewSource);
        Assert.Contains("<h2>Examples</h2>", viewSource);
        Assert.Contains("<h2>FAQ</h2>", viewSource);
        Assert.Contains("<h2>Related tools</h2>", viewSource);
        Assert.Contains("<h2>Same category tools</h2>", viewSource);
        Assert.Contains("<h2>Next tools</h2>", viewSource);
        Assert.Contains("id=\"tool-root\"", viewSource);

        var runtimeRootIndex = viewSource.IndexOf("id=\"tool-root\"", StringComparison.Ordinal);
        var seoIndex = viewSource.IndexOf("class=\"tool-seo\"", StringComparison.Ordinal);
        Assert.True(runtimeRootIndex > seoIndex);
    }

    private static int CountOccurrences(string source, string token)
    {
        var count = 0;
        var index = 0;
        while ((index = source.IndexOf(token, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += token.Length;
        }

        return count;
    }

    private static ToolsController BuildController(AppToolDescriptor descriptor, ToolContent content, IReadOnlyCollection<AppToolDescriptor> allTools)
    {
        var controller = new ToolsController(
            new StubCatalogService(descriptor, allTools),
            new StubContentService(content),
            Microsoft.Extensions.Options.Options.Create(new ApiSettings { BaseUrl = "https://localhost:5001", ToolExecutionPathPrefix = "/api/v1/tools" }),
            new ToolRegistryService(new StubManifestLoader(new WebToolManifest { Slug = descriptor.Slug, ViewName = "ToolShell", ModulePath = "/js/tools/json-formatter.js", Category = descriptor.Category })));

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("localhost:5001");

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext,
            RouteData = new RouteData()
        };

        return controller;
    }

    private sealed class StubManifestLoader(params WebToolManifest[] manifests) : IToolManifestLoader
    {
        public IReadOnlyCollection<WebToolManifest> LoadAll() => manifests;
    }

    private sealed class StubCatalogService(AppToolDescriptor descriptor, IReadOnlyCollection<AppToolDescriptor> allTools) : IToolCatalogService
    {
        public IReadOnlyCollection<AppToolDescriptor> GetAllTools() => allTools;
        public IReadOnlyCollection<string> GetAllCategories() => [descriptor.Category];
        public AppToolDescriptor? GetBySlug(string slug) => allTools.FirstOrDefault(t => string.Equals(t.Slug, slug, StringComparison.OrdinalIgnoreCase));
        public IReadOnlyCollection<AppToolDescriptor> GetByCategory(string category) => allTools.Where(t => string.Equals(t.Category, category, StringComparison.OrdinalIgnoreCase)).ToArray();
        public bool CategoryExists(string category) => string.Equals(category, descriptor.Category, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class StubContentService(ToolContent content) : IToolContentService
    {
        public Task<ToolContent?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) => Task.FromResult<ToolContent?>(content);
        public Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyCollection<string>>([content.Slug]);
    }
}
