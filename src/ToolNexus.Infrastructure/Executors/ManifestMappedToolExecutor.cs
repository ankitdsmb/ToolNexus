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
        ["case-converter"] = ["lowercase", "uppercase", "title-case", "sentence-case", "camel-case", "pascal-case", "snake-case", "screaming-snake-case", "kebab-case", "dot-case", "path-case", "alternating-case"],
        ["html-entities"] = ["encode", "decode"],
        ["yaml-to-json"] = ["convert"],
        ["json-to-yaml"] = ["convert"],
        ["file-merge"] = ["merge"]
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
            ("case-converter", "upper") => ConvertCase("uppercase", request.Input),
            ("case-converter", "lower") => ConvertCase("lowercase", request.Input),
            ("case-converter", "title") => ConvertCase("title-case", request.Input),
            ("case-converter", "lowercase") => ConvertCase(action, request.Input),
            ("case-converter", "uppercase") => ConvertCase(action, request.Input),
            ("case-converter", "title-case") => ConvertCase(action, request.Input),
            ("case-converter", "sentence-case") => ConvertCase(action, request.Input),
            ("case-converter", "camel-case") => ConvertCase(action, request.Input),
            ("case-converter", "pascal-case") => ConvertCase(action, request.Input),
            ("case-converter", "snake-case") => ConvertCase(action, request.Input),
            ("case-converter", "screaming-snake-case") => ConvertCase(action, request.Input),
            ("case-converter", "kebab-case") => ConvertCase(action, request.Input),
            ("case-converter", "dot-case") => ConvertCase(action, request.Input),
            ("case-converter", "path-case") => ConvertCase(action, request.Input),
            ("case-converter", "alternating-case") => ConvertCase(action, request.Input),
            ("html-entities", "encode") => WebUtility.HtmlEncode(request.Input),
            ("html-entities", "decode") => WebUtility.HtmlDecode(request.Input),
            ("yaml-to-json", "convert") => YamlToJson(request.Input),
            ("json-to-yaml", "convert") => JsonToYaml(request.Input),
            ("file-merge", "merge") => request.Input,
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

    private static string ConvertCase(string action, string input)
    {
        var lines = input.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n').Split('\n');
        return string.Join('\n', lines.Select(line => ConvertCaseLine(action, NormalizeLine(line))));
    }

    private static string NormalizeLine(string line)
    {
        if (string.IsNullOrWhiteSpace(line))
        {
            return string.Empty;
        }

        return Regex.Replace(line.Replace('\t', ' '), @"[ \f\v]+", " ").Trim();
    }

    private static string ConvertCaseLine(string action, string line)
    {
        if (string.IsNullOrEmpty(line))
        {
            return string.Empty;
        }

        var words = ParseWords(line);

        return action.ToLowerInvariant() switch
        {
            "lowercase" => line.ToLowerInvariant(),
            "uppercase" => line.ToUpperInvariant(),
            "title-case" => string.Join(" ", words.Select(TitleToken)),
            "sentence-case" => SentenceCase(words),
            "camel-case" => CamelCase(words),
            "pascal-case" => string.Concat(words.Select(TitleToken)),
            "snake-case" => string.Join("_", words.Select(x => x.Lower)),
            "screaming-snake-case" => string.Join("_", words.Select(x => x.Lower.ToUpperInvariant())),
            "kebab-case" => string.Join("-", words.Select(x => x.Lower)),
            "dot-case" => string.Join(".", words.Select(x => x.Lower)),
            "path-case" => string.Join("/", words.Select(x => x.Lower)),
            "alternating-case" => AlternatingCase(line),
            _ => line
        };
    }

    private static List<WordToken> ParseWords(string line)
    {
        var withBoundaries = Regex.Replace(line, "([\\p{Ll}\\p{Nd}])([\\p{Lu}])", "$1 $2");
        withBoundaries = Regex.Replace(withBoundaries, "([\\p{Lu}]+)([\\p{Lu}][\\p{Ll}])", "$1 $2");
        withBoundaries = Regex.Replace(withBoundaries, "([\\p{L}])(\\p{Nd})", "$1 $2");
        withBoundaries = Regex.Replace(withBoundaries, "(\\p{Nd})(\\p{L})", "$1 $2");

        return Regex.Split(withBoundaries, @"[\s_\-./\\]+|[^\p{L}\p{N}]+")
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => new WordToken(x, x.ToLowerInvariant(), IsAcronym(x)))
            .ToList();
    }

    private static bool IsAcronym(string word) => Regex.IsMatch(word, @"^\p{Lu}[\p{Lu}\p{Nd}]{1,}$");

    private static string TitleToken(WordToken word)
    {
        if (word.IsAcronym)
        {
            return word.Raw;
        }

        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(word.Lower);
    }

    private static string SentenceCase(List<WordToken> words)
    {
        if (words.Count == 0)
        {
            return string.Empty;
        }

        var sentence = new List<string>(words.Count);

        for (var index = 0; index < words.Count; index++)
        {
            var word = words[index];
            if (word.IsAcronym)
            {
                sentence.Add(word.Raw);
                continue;
            }

            sentence.Add(index == 0 ? CultureInfo.InvariantCulture.TextInfo.ToTitleCase(word.Lower) : word.Lower);
        }

        return string.Join(" ", sentence);
    }

    private static string CamelCase(List<WordToken> words)
    {
        if (words.Count == 0)
        {
            return string.Empty;
        }

        var result = new StringBuilder(words[0].Lower);
        foreach (var word in words.Skip(1))
        {
            result.Append(word.IsAcronym ? word.Raw : CultureInfo.InvariantCulture.TextInfo.ToTitleCase(word.Lower));
        }

        return result.ToString();
    }

    private static string AlternatingCase(string input)
    {
        var useUpper = true;
        var builder = new StringBuilder(input.Length);
        foreach (var c in input)
        {
            if (char.IsLetter(c))
            {
                builder.Append(useUpper ? char.ToUpperInvariant(c) : char.ToLowerInvariant(c));
                useUpper = !useUpper;
            }
            else
            {
                builder.Append(c);
            }
        }

        return builder.ToString();
    }

    private sealed record WordToken(string Raw, string Lower, bool IsAcronym);
}
