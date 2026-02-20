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
        var resolver = new ToolViewResolver();

        var result = resolver.ResolveViewName(slug);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void ResolveViewName_IsCaseInsensitive()
    {
        var resolver = new ToolViewResolver();

        var result = resolver.ResolveViewName("JSON-FORMATTER");

        Assert.Equal("JsonFormatter", result);
    }

    [Fact]
    public void ResolveViewName_UnknownSlug_ReturnsFallbackToolView()
    {
        var resolver = new ToolViewResolver();

        var result = resolver.ResolveViewName("not-mapped");

        Assert.Equal("Tool", result);
    }
}
