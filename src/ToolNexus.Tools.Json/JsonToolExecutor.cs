using System.Globalization;
using System.Text;
using System.Text.Json;
using CsvHelper;
using ToolNexus.Tools.Common;

namespace ToolNexus.Tools.Json;

public sealed class JsonToolExecutor : IToolExecutor
{
    public string Slug => "json-formatter";

    public IReadOnlyCollection<string> SupportedActions { get; } = ["format", "minify", "validate", "to-csv"];

    public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
    {
        var action = request.Action.Trim().ToLowerInvariant();

        try
        {
            var output = action switch
            {
                "format" => Format(request.Input),
                "minify" => Minify(request.Input),
                "validate" => Validate(request.Input),
                "to-csv" => ToCsv(request.Input),
                _ => throw new NotSupportedException($"Action '{action}' is not supported by {Slug}.")
            };

            return Task.FromResult(ToolResult.Ok(output));
        }
        catch (Exception ex)
        {
            return Task.FromResult(ToolResult.Fail(ex.Message));
        }
    }

    private static string Format(string input)
    {
        using var doc = JsonDocument.Parse(input);
        return JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true });
    }

    private static string Minify(string input)
    {
        using var doc = JsonDocument.Parse(input);
        return JsonSerializer.Serialize(doc.RootElement);
    }

    private static string Validate(string input)
    {
        using var _ = JsonDocument.Parse(input);
        return "Valid JSON";
    }

    private static string ToCsv(string input)
    {
        using var doc = JsonDocument.Parse(input);
        var rows = doc.RootElement.ValueKind switch
        {
            JsonValueKind.Array => doc.RootElement.EnumerateArray().Select(JsonElementToFlatDictionary).ToList(),
            JsonValueKind.Object => [JsonElementToFlatDictionary(doc.RootElement)],
            _ => throw new InvalidOperationException("JSON root must be an object or array for CSV conversion.")
        };

        if (rows.Count == 0)
        {
            return string.Empty;
        }

        var headers = rows.SelectMany(x => x.Keys).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
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
                csv.WriteField(row.GetValueOrDefault(header, string.Empty));
            }

            csv.NextRecord();
        }

        return writer.ToString();
    }

    private static Dictionary<string, string> JsonElementToFlatDictionary(JsonElement element)
    {
        var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (element.ValueKind != JsonValueKind.Object)
        {
            data["value"] = element.ToString();
            return data;
        }

        foreach (var prop in element.EnumerateObject())
        {
            data[prop.Name] = prop.Value.ValueKind switch
            {
                JsonValueKind.Array or JsonValueKind.Object => prop.Value.GetRawText(),
                JsonValueKind.String => prop.Value.GetString() ?? string.Empty,
                JsonValueKind.Null => string.Empty,
                _ => prop.Value.ToString()
            };
        }

        return data;
    }
}
