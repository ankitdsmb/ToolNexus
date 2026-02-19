using System.Text;
using System.Text.Json;
using System.Xml;

namespace ToolNexus.Infrastructure.Executors;

internal static class JsonToXmlConverter
{
    private const string DefaultRootName = "root";
    private const string ArrayItemName = "item";

    internal static string Convert(string input)
    {
        var normalized = NormalizeInput(input);
        using var document = ParseJson(normalized);

        var settings = new XmlWriterSettings
        {
            OmitXmlDeclaration = true,
            Indent = true,
            IndentChars = "  ",
            NewLineChars = "\n",
            NewLineHandling = NewLineHandling.None
        };

        var builder = new StringBuilder(Math.Max(normalized.Length, 128));
        using var writer = XmlWriter.Create(builder, settings);

        writer.WriteStartElement(DefaultRootName);
        WriteElementValue(writer, document.RootElement, ArrayItemName);
        writer.WriteEndElement();
        writer.Flush();

        return builder.ToString();
    }

    private static string NormalizeInput(string input)
    {
        var normalized = (input ?? string.Empty).Replace("\r\n", "\n").Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new InvalidOperationException("Please provide JSON input before converting.");
        }

        return normalized;
    }

    private static JsonDocument ParseJson(string input)
    {
        try
        {
            return JsonDocument.Parse(input);
        }
        catch (JsonException ex)
        {
            var line = ex.LineNumber is { } lineNumber ? lineNumber + 1 : 0;
            var column = ex.BytePositionInLine is { } bytePosition ? bytePosition + 1 : 0;

            if (line > 0 && column > 0)
            {
                throw new InvalidOperationException($"Invalid JSON near line {line}, column {column}: {ex.Message}");
            }

            throw new InvalidOperationException($"Invalid JSON: {ex.Message}");
        }
    }

    private static void WriteElementValue(XmlWriter writer, JsonElement value, string elementName)
    {
        switch (value.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartElement(SanitizeName(elementName));
                foreach (var property in value.EnumerateObject())
                {
                    WriteElementValue(writer, property.Value, property.Name);
                }
                writer.WriteEndElement();
                break;

            case JsonValueKind.Array:
                writer.WriteStartElement(SanitizeName(elementName));
                foreach (var item in value.EnumerateArray())
                {
                    WriteElementValue(writer, item, ArrayItemName);
                }
                writer.WriteEndElement();
                break;

            case JsonValueKind.Null:
                writer.WriteStartElement(SanitizeName(elementName));
                writer.WriteEndElement();
                break;

            case JsonValueKind.True:
            case JsonValueKind.False:
                writer.WriteElementString(SanitizeName(elementName), value.GetBoolean() ? "true" : "false");
                break;

            case JsonValueKind.Number:
                writer.WriteElementString(SanitizeName(elementName), value.GetRawText());
                break;

            case JsonValueKind.String:
                writer.WriteElementString(SanitizeName(elementName), value.GetString() ?? string.Empty);
                break;

            default:
                writer.WriteElementString(SanitizeName(elementName), value.GetRawText());
                break;
        }
    }

    private static string SanitizeName(string candidate)
    {
        var source = string.IsNullOrWhiteSpace(candidate) ? "node" : candidate.Trim();
        var builder = new StringBuilder(source.Length + 2);

        foreach (var character in source)
        {
            builder.Append(XmlConvert.IsNCNameChar(character) ? character : '_');
        }

        if (builder.Length == 0)
        {
            return "node";
        }

        if (!XmlConvert.IsStartNCNameChar(builder[0]))
        {
            builder.Insert(0, 'n');
            builder.Insert(1, '_');
        }

        return builder.ToString();
    }
}
