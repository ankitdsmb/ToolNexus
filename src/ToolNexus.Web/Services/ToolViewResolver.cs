namespace ToolNexus.Web.Services;

public sealed class ToolViewResolver : IToolViewResolver
{
    private static readonly IReadOnlyDictionary<string, string> SlugViewMap =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["json-formatter"] = "JsonFormatter",
            ["base64-decode"] = "base64Decode",
            ["base64-encode"] = "base64Encode",
            ["json-to-csv"] = "json2csv",
            ["json-to-yaml"] = "jsonToYaml",
            ["yaml-to-json"] = "yamlToJson",
            ["csv-to-json"] = "CsvToJson",
            ["json-validator"] = "JsonValidator",
            ["sql-formatter"] = "SqlFormatter",
            ["file-merge"] = "fileMerge",
            ["html-entities"] = "htmlEntities",
            ["uuid-generator"] = "uuidGenerator",
            ["url-encode"] = "urlEncode",
            ["url-decode"] = "urlDecode",
            ["text-diff"] = "TextDiff"
        };

    public string ResolveViewName(string slug) =>
        SlugViewMap.TryGetValue(slug, out var viewName) ? viewName : "Tool";
}
