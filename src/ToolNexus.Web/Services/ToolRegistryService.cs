namespace ToolNexus.Web.Services;

public sealed class ToolRegistryService : IToolRegistryService
{
    private static readonly IReadOnlyCollection<ToolDescriptor> Descriptors =
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

    private readonly IReadOnlyDictionary<string, ToolDescriptor> descriptorsBySlug =
        Descriptors.ToDictionary(descriptor => descriptor.Slug, StringComparer.OrdinalIgnoreCase);

    public ToolDescriptor? GetBySlug(string slug) =>
        descriptorsBySlug.TryGetValue(slug, out var descriptor) ? descriptor : null;

    public IReadOnlyCollection<ToolDescriptor> GetAll() => Descriptors;
}
