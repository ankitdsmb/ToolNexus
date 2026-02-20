using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using ToolNexus.Application.Models;
using AppToolDescriptor = ToolNexus.Application.Models.ToolDescriptor;
using ToolNexus.Application.Services;
using ToolNexus.Web.Controllers;
using ToolNexus.Web.Models;
using ToolNexus.Web.Options;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Tests;

public sealed class ToolsControllerRegressionHarnessTests
{
    public static TheoryData<string> SlugViewMappings => new()
    {
        { "json-formatter" },
        { "base64-decode" },
        { "base64-encode" },
        { "json-to-csv" },
        { "json-to-yaml" },
        { "yaml-to-json" },
        { "csv-to-json" },
        { "json-validator" },
        { "sql-formatter" },
        { "file-merge" },
        { "html-entities" },
        { "uuid-generator" },
        { "url-encode" },
        { "url-decode" },
        { "text-diff" }
    };

    [Theory]
    [MemberData(nameof(SlugViewMappings))]
    public async Task Segment_KnownSlug_ResolvesExpectedViewAndModel(string slug)
    {
        var descriptor = CreateDescriptor(slug);
        var content = CreateContent(slug);
        var controller = CreateController(new StubToolCatalogService(descriptor), new StubToolContentService(content));

        var result = await controller.Segment(slug, CancellationToken.None);

        var view = Assert.IsType<ViewResult>(result);
        Assert.Equal("ToolShell", view.ViewName);
        var model = Assert.IsType<ToolPageViewModel>(view.Model);
        Assert.Same(descriptor, model.Tool);
        Assert.Equal("https://localhost:5001/tools/" + slug, model.Seo.CanonicalUrl);
        Assert.Equal(content.SeoTitle, model.Seo.Title);
        Assert.Equal(content.SeoDescription, model.Seo.Description);
    }

    [Fact]
    public async Task Segment_UnmappedKnownSlug_UsesToolShell()
    {
        var descriptor = CreateDescriptor("no-custom-view");
        var controller = CreateController(new StubToolCatalogService(descriptor), new StubToolContentService(CreateContent(descriptor.Slug)));

        var result = await controller.Segment(descriptor.Slug, CancellationToken.None);

        var view = Assert.IsType<ViewResult>(result);
        Assert.Equal("ToolShell", view.ViewName);
    }

    [Fact]
    public async Task Segment_UnknownSlug_ReturnsNotFound()
    {
        var controller = CreateController(new StubToolCatalogService(null), new StubToolContentService(null));

        var result = await controller.Segment("unknown-slug", CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Segment_CategoryRoute_ReturnsCategoryView()
    {
        var category = "encoding";
        var tools = new[] { CreateDescriptor("base64-encode") };
        var controller = CreateController(new StubToolCatalogService(null, [category], tools), new StubToolContentService(null));

        var result = await controller.Segment(category, CancellationToken.None);

        var view = Assert.IsType<ViewResult>(result);
        Assert.Equal("Category", view.ViewName);
        var model = Assert.IsType<ToolCategoryViewModel>(view.Model);
        Assert.Equal(category, model.Category);
        Assert.Single(model.Tools);
    }

    [Fact]
    public void Segment_RouteAndOutputCacheAttributes_Unchanged()
    {
        var method = typeof(ToolsController).GetMethod(nameof(ToolsController.Segment));
        Assert.NotNull(method);

        var route = Assert.Single(method!.GetCustomAttributes(typeof(HttpGetAttribute), inherit: false).Cast<HttpGetAttribute>());
        Assert.Equal("{segment}", route.Template);

        var cache = Assert.Single(method.GetCustomAttributes(typeof(Microsoft.AspNetCore.OutputCaching.OutputCacheAttribute), inherit: false)
            .Cast<Microsoft.AspNetCore.OutputCaching.OutputCacheAttribute>());
        Assert.Equal(300, cache.Duration);
        Assert.NotNull(cache.VaryByRouteValueNames);
        Assert.Contains("segment", cache.VaryByRouteValueNames!);
    }

    private static ToolsController CreateController(IToolCatalogService catalogService, IToolContentService contentService)
    {
        var controller = new ToolsController(
            catalogService,
            contentService,
            Microsoft.Extensions.Options.Options.Create(new ApiSettings { BaseUrl = "https://localhost:5001", ToolExecutionPathPrefix = "/api/v1/tools" }),
            CreateRegistry());

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


    private static readonly ToolNexus.Web.Services.ToolManifest[] BaselineManifests =
    [
        new ToolNexus.Web.Services.ToolManifest { Slug = "json-formatter", ViewName = "JsonFormatter", ModulePath = "/js/tools/json-formatter.js", CssPath = "/css/pages/json-formatter.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "base64-decode", ViewName = "base64Decode", ModulePath = "/js/tools/base64-decode.js", CssPath = "/css/tools/base64-decode.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "base64-encode", ViewName = "base64Encode", ModulePath = "/js/tools/base64-encode.js", CssPath = "/css/tools/base64-encode.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "json-to-csv", ViewName = "json2csv", ModulePath = "/js/tools/json-to-csv.js", CssPath = "/css/pages/json-to-csv.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "json-to-yaml", ViewName = "jsonToYaml", ModulePath = "/js/tools/json-to-yaml.js", CssPath = "/css/pages/json-to-yaml.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "yaml-to-json", ViewName = "yamlToJson", ModulePath = "/js/tools/yaml-to-json.js", CssPath = "/css/pages/yaml-to-json.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "csv-to-json", ViewName = "CsvToJson", ModulePath = "/js/tools/csv-to-json.js", CssPath = "/css/tools/csv-to-json.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "json-validator", ViewName = "JsonValidator", ModulePath = "/js/tools/json-validator.js", CssPath = "/css/pages/json-validator.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "sql-formatter", ViewName = "SqlFormatter", ModulePath = "/js/tools/sql-formatter.js", CssPath = "/css/pages/sql-formatter.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "file-merge", ViewName = "fileMerge", ModulePath = "/js/tools/file-merge/main.js", CssPath = "/css/tools/file-merge.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "html-entities", ViewName = "htmlEntities", ModulePath = "/js/tools/html-entities.js", CssPath = "/css/tools/html-entities.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "uuid-generator", ViewName = "uuidGenerator", ModulePath = "/js/tools/uuid-generator.js", CssPath = "/css/tools/uuid-generator.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "url-encode", ViewName = "urlEncode", ModulePath = "/js/tools/url-encode.js", CssPath = "/css/tools/url-encode.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "url-decode", ViewName = "urlDecode", ModulePath = "/js/tools/url-decode.js", CssPath = "/css/tools/url-decode.css", Category = string.Empty },
        new ToolNexus.Web.Services.ToolManifest { Slug = "text-diff", ViewName = "TextDiff", ModulePath = "/js/tools/text-diff.js", CssPath = "/css/tools/text-diff.css", Category = string.Empty }
    ];

    private static ToolRegistryService CreateRegistry() => new(new StubManifestLoader(BaselineManifests));

    private sealed class StubManifestLoader(params ToolNexus.Web.Services.ToolManifest[] manifests) : IToolManifestLoader
    {
        public IReadOnlyCollection<ToolNexus.Web.Services.ToolManifest> LoadAll() => manifests;
    }

    private static AppToolDescriptor CreateDescriptor(string slug) => new()
    {
        Slug = slug,
        Title = "Test Tool",
        Category = "parsers",
        Actions = ["run"],
        SeoTitle = "Descriptor Seo Title",
        SeoDescription = "Descriptor Seo Description",
        ExampleInput = "example"
    };

    private static ToolContent CreateContent(string slug) => new()
    {
        Id = 1,
        Slug = slug,
        Title = "Content title",
        SeoTitle = "Content Seo Title",
        SeoDescription = "Content Seo Description",
        Intro = "short",
        LongDescription = "long",
        Keywords = "k1,k2",
        Steps = [new ToolStep { Id = 1, Slug = slug, Title = "Step", Description = "Do this", SortOrder = 0 }],
        Examples = [new ToolExample { Id = 1, Slug = slug, Title = "Example", Input = "in", Output = "out", SortOrder = 0 }],
        Faq = [new ToolFaq { Id = 1, Slug = slug, Question = "Q", Answer = "A", SortOrder = 0 }],
        UseCases = ["Use case"]
    };

    private sealed class StubToolCatalogService(AppToolDescriptor? descriptor, IReadOnlyCollection<string>? categories = null, IReadOnlyCollection<AppToolDescriptor>? byCategory = null) : IToolCatalogService
    {
        private readonly IReadOnlyCollection<string> categories = categories ?? [];
        private readonly IReadOnlyCollection<AppToolDescriptor> byCategory = byCategory ?? [];

        public IReadOnlyCollection<AppToolDescriptor> GetAllTools() => descriptor is null ? [] : [descriptor];

        public IReadOnlyCollection<string> GetAllCategories() => categories;

        public AppToolDescriptor? GetBySlug(string slug) => descriptor is not null && string.Equals(descriptor.Slug, slug, StringComparison.OrdinalIgnoreCase)
            ? descriptor
            : null;

        public IReadOnlyCollection<AppToolDescriptor> GetByCategory(string category) => byCategory;

        public bool CategoryExists(string category) => categories.Contains(category, StringComparer.OrdinalIgnoreCase);
    }

    private sealed class StubToolContentService(ToolContent? content) : IToolContentService
    {
        public Task<ToolContent?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
            Task.FromResult(content is not null && string.Equals(content.Slug, slug, StringComparison.OrdinalIgnoreCase)
                ? content
                : null);

        public Task<IReadOnlyCollection<string>> GetAllSlugsAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyCollection<string>>(content is null ? [] : [content.Slug]);
    }
}
