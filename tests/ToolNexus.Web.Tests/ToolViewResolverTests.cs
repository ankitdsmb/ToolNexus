using ToolNexus.Web.Services;

namespace ToolNexus.Web.Tests;

public sealed class ToolViewResolverTests
{
    public static TheoryData<string, string> SlugViewMappings => new()
    {
        { "json-formatter", "JsonFormatter" },
        { "base64-decode", "base64Decode" },
        { "base64-encode", "base64Encode" },
        { "json-to-csv", "json2csv" },
        { "json-to-yaml", "jsonToYaml" },
        { "yaml-to-json", "yamlToJson" },
        { "csv-to-json", "CsvToJson" },
        { "json-validator", "JsonValidator" },
        { "sql-formatter", "SqlFormatter" },
        { "file-merge", "fileMerge" },
        { "html-entities", "htmlEntities" },
        { "uuid-generator", "uuidGenerator" },
        { "url-encode", "urlEncode" },
        { "url-decode", "urlDecode" },
        { "text-diff", "TextDiff" }
    };

    [Theory]
    [MemberData(nameof(SlugViewMappings))]
    public void ResolveViewName_KnownSlug_ReturnsMappedView(string slug, string expected)
    {
        var resolver = new ToolViewResolver(CreateRegistry());

        var result = resolver.ResolveViewName(slug);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void ResolveViewName_IsCaseInsensitive()
    {
        var resolver = new ToolViewResolver(CreateRegistry());

        var result = resolver.ResolveViewName("JSON-FORMATTER");

        Assert.Equal("JsonFormatter", result);
    }

    [Fact]
    public void ResolveViewName_UnknownSlug_ReturnsFallbackToolView()
    {
        var resolver = new ToolViewResolver(CreateRegistry());

        var result = resolver.ResolveViewName("not-mapped");

        Assert.Equal("Tool", result);
    }

    [Fact]
    public void ResolveViewName_UsesRegistryMetadataForNewTool()
    {
        var resolver = new ToolViewResolver(new StubToolRegistryService(new ToolNexus.Web.Services.ToolDescriptor
        {
            Slug = "new-tool",
            ViewName = "NewToolView",
            Category = "custom"
        }));

        var result = resolver.ResolveViewName("new-tool");

        Assert.Equal("NewToolView", result);
    }


    private static readonly ToolManifest[] BaselineManifests =
    [
        new() { Slug = "json-formatter", ViewName = "JsonFormatter", Category = string.Empty },
        new() { Slug = "base64-decode", ViewName = "base64Decode", Category = string.Empty },
        new() { Slug = "base64-encode", ViewName = "base64Encode", Category = string.Empty },
        new() { Slug = "json-to-csv", ViewName = "json2csv", Category = string.Empty },
        new() { Slug = "json-to-yaml", ViewName = "jsonToYaml", Category = string.Empty },
        new() { Slug = "yaml-to-json", ViewName = "yamlToJson", Category = string.Empty },
        new() { Slug = "csv-to-json", ViewName = "CsvToJson", Category = string.Empty },
        new() { Slug = "json-validator", ViewName = "JsonValidator", Category = string.Empty },
        new() { Slug = "sql-formatter", ViewName = "SqlFormatter", Category = string.Empty },
        new() { Slug = "file-merge", ViewName = "fileMerge", Category = string.Empty },
        new() { Slug = "html-entities", ViewName = "htmlEntities", Category = string.Empty },
        new() { Slug = "uuid-generator", ViewName = "uuidGenerator", Category = string.Empty },
        new() { Slug = "url-encode", ViewName = "urlEncode", Category = string.Empty },
        new() { Slug = "url-decode", ViewName = "urlDecode", Category = string.Empty },
        new() { Slug = "text-diff", ViewName = "TextDiff", Category = string.Empty }
    ];

    private static ToolRegistryService CreateRegistry() => new(new StubManifestLoader(BaselineManifests));

    private sealed class StubManifestLoader(params ToolManifest[] manifests) : IToolManifestLoader
    {
        public IReadOnlyCollection<ToolManifest> LoadAll() => manifests;
    }
    private sealed class StubToolRegistryService(params ToolNexus.Web.Services.ToolDescriptor[] descriptors) : IToolRegistryService
    {
        private readonly IReadOnlyDictionary<string, ToolNexus.Web.Services.ToolDescriptor> bySlug =
            descriptors.ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

        public ToolNexus.Web.Services.ToolDescriptor? GetBySlug(string slug) =>
            bySlug.TryGetValue(slug, out var descriptor) ? descriptor : null;

        public IReadOnlyCollection<ToolNexus.Web.Services.ToolDescriptor> GetAll() => bySlug.Values.ToArray();
    }

}
