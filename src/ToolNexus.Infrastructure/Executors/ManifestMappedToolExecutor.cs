using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using CsvHelper;
using ToolNexus.Application.Abstractions;

namespace ToolNexus.Infrastructure.Executors;

public sealed class ManifestMappedToolExecutor(string slug) : ToolExecutorBase
{
    private static readonly IReadOnlyDictionary<string, string[]> ActionsBySlug = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
    {
        ["json-to-xml"] = ["convert"],
        ["xml-to-json"] = ["convert"],
        ["csv-to-json"] = ["convert"],
        ["json-to-csv"] = ["convert"],
        ["base64-decode"] = ["decode"],
        ["url-encode"] = ["encode"],
        ["url-decode"] = ["decode"],
        ["markdown-to-html"] = ["convert"],
        ["html-to-markdown"] = ["convert"],
        ["js-minifier"] = ["minify", "format"],
        ["sql-formatter"] = ["format", "minify"],
        ["regex-tester"] = ["test"],
        ["text-diff"] = ["compare"],
        ["uuid-generator"] = ["generate"],
        ["case-converter"] = ["upper", "lower", "title"],
        ["html-entities"] = ["encode", "decode"],
        ["yaml-to-json"] = ["convert"],
        ["json-to-yaml"] = ["convert"]
    };

    public override string Slug { get; } = slug;

    public override ToolMetadata Metadata { get; } = new(
        slug,
        $"Tool executor for {slug}.",
        "utility",
        string.Empty,
        [slug, "utility"]);

    public override IReadOnlyCollection<string> SupportedActions { get; } = ActionsBySlug[slug];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        var output = (Slug.ToLowerInvariant(), action.ToLowerInvariant()) switch
        {
            ("json-to-xml", "convert") => JsonToXml(request.Input),
            ("xml-to-json", "convert") => XmlToJson(request.Input),
            ("csv-to-json", "convert") => CsvToJson(request.Input),
            ("json-to-csv", "convert") => JsonToCsv(request.Input),
            ("base64-decode", "decode") => Encoding.UTF8.GetString(Convert.FromBase64String(request.Input)),
            ("url-encode", "encode") => Uri.EscapeDataString(request.Input),
            ("url-decode", "decode") => Uri.UnescapeDataString(request.Input),
            ("markdown-to-html", "convert") => MarkdownToHtml(request.Input),
            ("html-to-markdown", "convert") => HtmlToMarkdown(request.Input),
            ("js-minifier", "minify") => Regex.Replace(request.Input, @"\s+", " ").Trim(),
            ("js-minifier", "format") => request.Input.Trim(),
            ("sql-formatter", "format") => request.Input.Trim(),
            ("sql-formatter", "minify") => Regex.Replace(request.Input, @"\s+", " ").Trim(),
            ("regex-tester", "test") => RegexTest(request),
            ("text-diff", "compare") => TextDiff(request.Input),
            ("uuid-generator", "generate") => Guid.NewGuid().ToString(),
            ("case-converter", "upper") => request.Input.ToUpperInvariant(),
            ("case-converter", "lower") => request.Input.ToLowerInvariant(),
            ("case-converter", "title") => CultureInfo.InvariantCulture.TextInfo.ToTitleCase(request.Input.ToLowerInvariant()),
            ("html-entities", "encode") => WebUtility.HtmlEncode(request.Input),
            ("html-entities", "decode") => WebUtility.HtmlDecode(request.Input),
            ("yaml-to-json", "convert") => YamlToJson(request.Input),
            ("json-to-yaml", "convert") => JsonToYaml(request.Input),
            _ => throw new InvalidOperationException($"Unsupported route: {Slug}/{action}")
        };

        return Task.FromResult(ToolResult.Ok(output));
    }

    private static string JsonToXml(string input)
    {
        using var doc = JsonDocument.Parse(input);
        var root = new XElement("root");
        AppendJson(root, doc.RootElement, "item");
        return root.ToString();
    }

    private static void AppendJson(XElement parent, JsonElement element, string name)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new XElement(name);
                foreach (var prop in element.EnumerateObject())
                {
                    AppendJson(obj, prop.Value, prop.Name);
                }
                parent.Add(obj);
                break;
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                {
                    AppendJson(parent, item, name);
                }
                break;
            default:
                parent.Add(new XElement(name, element.ToString()));
                break;
        }
    }

    private static string XmlToJson(string input)
    {
        var xml = XDocument.Parse(input);
        var dict = xml.Root is null ? new Dictionary<string, object?>() : ElementToDictionary(xml.Root);
        return JsonSerializer.Serialize(dict, new JsonSerializerOptions { WriteIndented = true });
    }

    private static Dictionary<string, object?> ElementToDictionary(XElement element)
    {
        var children = element.Elements().ToList();
        if (children.Count == 0)
        {
            return new Dictionary<string, object?> { [element.Name.LocalName] = element.Value };
        }

        var grouped = children.GroupBy(x => x.Name.LocalName);
        var obj = new Dictionary<string, object?>();
        foreach (var group in grouped)
        {
            obj[group.Key] = group.Count() == 1
                ? ElementToValue(group.First())
                : group.Select(ElementToValue).ToArray();
        }

        return new Dictionary<string, object?> { [element.Name.LocalName] = obj };
    }

    private static object? ElementToValue(XElement element)
    {
        var children = element.Elements().ToList();
        return children.Count == 0
            ? element.Value
            : children.GroupBy(x => x.Name.LocalName)
                .ToDictionary(g => g.Key, g => g.Count() == 1 ? ElementToValue(g.First()) : g.Select(ElementToValue).ToArray());
    }

    private static string CsvToJson(string input)
    {
        using var reader = new StringReader(input);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        var records = csv.GetRecords<dynamic>().Select(x => (IDictionary<string, object>)x)
            .Select(row => row.ToDictionary(k => k.Key, v => v.Value?.ToString() ?? string.Empty))
            .ToList();
        return JsonSerializer.Serialize(records, new JsonSerializerOptions { WriteIndented = true });
    }

    private static string JsonToCsv(string input)
    {
        using var doc = JsonDocument.Parse(input);
        var rows = doc.RootElement.ValueKind == JsonValueKind.Array
            ? doc.RootElement.EnumerateArray().ToList()
            : [doc.RootElement];

        var headers = rows
            .Where(x => x.ValueKind == JsonValueKind.Object)
            .SelectMany(x => x.EnumerateObject().Select(p => p.Name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        foreach (var header in headers)
        {
            csv.WriteField(header);
        }
        csv.NextRecord();

        foreach (var row in rows)
        {
            foreach (var header in headers)
            {
                var value = row.ValueKind == JsonValueKind.Object && row.TryGetProperty(header, out var prop)
                    ? prop.ToString()
                    : string.Empty;
                csv.WriteField(value);
            }
            csv.NextRecord();
        }

        return writer.ToString();
    }

    private static string MarkdownToHtml(string input)
    {
        var encoded = WebUtility.HtmlEncode(input);
        return $"<p>{encoded.Replace("\n", "<br/>")}</p>";
    }

    private static string HtmlToMarkdown(string input)
    {
        var withoutTags = Regex.Replace(input, "<br\\s*/?>", "\n", RegexOptions.IgnoreCase);
        withoutTags = Regex.Replace(withoutTags, "<[^>]+>", string.Empty);
        return WebUtility.HtmlDecode(withoutTags).Trim();
    }

    private static string RegexTest(ToolRequest request)
    {
        var pattern = request.Options is not null && request.Options.TryGetValue("pattern", out var configuredPattern)
            ? configuredPattern
            : request.Input;
        var candidate = request.Options is not null && request.Options.TryGetValue("input", out var configuredInput)
            ? configuredInput
            : request.Input;
        return Regex.IsMatch(candidate, pattern) ? "match" : "no-match";
    }

    private static string TextDiff(string input)
    {
        var parts = input.Split("\n---\n", 2, StringSplitOptions.None);
        if (parts.Length < 2)
        {
            return "Provide two blocks separated by '\n---\n'.";
        }

        var left = parts[0].Split('\n');
        var right = parts[1].Split('\n');
        var sb = new StringBuilder();
        var max = Math.Max(left.Length, right.Length);
        for (var i = 0; i < max; i++)
        {
            var l = i < left.Length ? left[i] : string.Empty;
            var r = i < right.Length ? right[i] : string.Empty;
            if (!string.Equals(l, r, StringComparison.Ordinal))
            {
                sb.AppendLine($"- {l}");
                sb.AppendLine($"+ {r}");
            }
        }

        return sb.Length == 0 ? "No differences" : sb.ToString().TrimEnd();
    }

    private static string YamlToJson(string input)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in input.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var idx = line.IndexOf(':');
            if (idx <= 0)
            {
                continue;
            }

            dict[line[..idx].Trim()] = line[(idx + 1)..].Trim();
        }

        return JsonSerializer.Serialize(dict, new JsonSerializerOptions { WriteIndented = true });
    }

    private static string JsonToYaml(string input)
    {
        using var doc = JsonDocument.Parse(input);
        var sb = new StringBuilder();
        AppendYaml(sb, doc.RootElement, 0, null);
        return sb.ToString().TrimEnd();
    }

    private static void AppendYaml(StringBuilder sb, JsonElement element, int depth, string? name)
    {
        var indent = new string(' ', depth * 2);
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                if (!string.IsNullOrWhiteSpace(name))
                {
                    sb.AppendLine($"{indent}{name}:");
                }
                foreach (var prop in element.EnumerateObject())
                {
                    AppendYaml(sb, prop.Value, depth + (name is null ? 0 : 1), prop.Name);
                }
                break;
            case JsonValueKind.Array:
                if (!string.IsNullOrWhiteSpace(name))
                {
                    sb.AppendLine($"{indent}{name}:");
                }
                foreach (var item in element.EnumerateArray())
                {
                    if (item.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
                    {
                        sb.AppendLine($"{indent}-");
                        AppendYaml(sb, item, depth + 1, null);
                    }
                    else
                    {
                        sb.AppendLine($"{indent}- {item}");
                    }
                }
                break;
            default:
                if (name is null)
                {
                    sb.AppendLine($"{indent}{element}");
                }
                else
                {
                    sb.AppendLine($"{indent}{name}: {element}");
                }
                break;
        }
    }
}
