using System.Text.Json;
using ToolNexus.Application.Abstractions;

namespace ToolNexus.Infrastructure.Executors;

public sealed class JsonToolkitProToolExecutor : ToolExecutorBase
{
    public override string Slug => "json-toolkit-pro";

    public override ToolMetadata Metadata { get; } = new(
        "JSON Toolkit Pro",
        "Developer-grade JSON normalization, formatting, and structural analysis.",
        "json",
        "{\"operation\":\"analyze\",\"json\":\"{\\\"name\\\":\\\"Ada\\\"}\"}",
        ["json", "analysis", "formatting", "deterministic"]);

    public override IReadOnlyCollection<string> SupportedActions { get; } = ["execute"];

    protected override Task<ToolResult> ExecuteCoreAsync(string action, ToolRequest request, CancellationToken cancellationToken)
    {
        if (!string.Equals(action, "execute", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(ToolResult.Fail($"Action '{action}' is not supported by {Slug}."));
        }

        try
        {
            var command = ParseCommand(request.Input);
            var output = command.Operation switch
            {
                "normalize" => ExecuteNormalize(command.JsonPayload),
                "pretty" => ExecutePretty(command.JsonPayload),
                "analyze" => ExecuteAnalyze(command.JsonPayload),
                _ => throw new InvalidOperationException("Invalid operation. Supported operations are: normalize, pretty, analyze.")
            };

            return Task.FromResult(ToolResult.Ok(output));
        }
        catch (JsonException ex)
        {
            return Task.FromResult(ToolResult.Fail($"Invalid JSON input: {ex.Message}"));
        }
        catch (InvalidOperationException ex)
        {
            return Task.FromResult(ToolResult.Fail(ex.Message));
        }
    }

    private static string ExecuteNormalize(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        var normalizedJson = JsonSerializer.Serialize(doc.RootElement);

        return JsonSerializer.Serialize(new
        {
            operation = "normalize",
            normalizedJson
        });
    }

    private static string ExecutePretty(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        var prettyJson = JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        return JsonSerializer.Serialize(new
        {
            operation = "pretty",
            prettyJson
        });
    }

    private static string ExecuteAnalyze(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        var metrics = AnalyzeElement(doc.RootElement, depth: 1);

        return JsonSerializer.Serialize(new
        {
            operation = "analyze",
            propertyCount = metrics.PropertyCount,
            nestingDepth = metrics.NestingDepth,
            arrayCount = metrics.ArrayCount,
            objectCount = metrics.ObjectCount
        });
    }

    private static JsonToolkitCommand ParseCommand(string input)
    {
        using var rootDocument = JsonDocument.Parse(input);
        if (rootDocument.RootElement.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException("Input payload must be a JSON object with 'operation' and 'json' properties.");
        }

        if (!rootDocument.RootElement.TryGetProperty("operation", out var operationElement)
            || operationElement.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException("Input payload must include a string 'operation' property.");
        }

        if (!rootDocument.RootElement.TryGetProperty("json", out var jsonElement)
            || jsonElement.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException("Input payload must include a string 'json' property containing JSON text.");
        }

        var operation = operationElement.GetString()?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(operation))
        {
            throw new InvalidOperationException("Operation cannot be empty. Supported operations are: normalize, pretty, analyze.");
        }

        var jsonPayload = jsonElement.GetString();
        if (string.IsNullOrWhiteSpace(jsonPayload))
        {
            throw new InvalidOperationException("The 'json' property cannot be empty.");
        }

        return new JsonToolkitCommand(operation, jsonPayload);
    }

    private static JsonAnalysisMetrics AnalyzeElement(JsonElement element, int depth)
    {
        var metrics = new JsonAnalysisMetrics
        {
            NestingDepth = depth
        };

        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                metrics.ObjectCount++;
                foreach (var property in element.EnumerateObject())
                {
                    metrics.PropertyCount++;
                    var nested = AnalyzeElement(property.Value, depth + 1);
                    metrics = metrics.Combine(nested);
                }

                break;

            case JsonValueKind.Array:
                metrics.ArrayCount++;
                foreach (var item in element.EnumerateArray())
                {
                    var nested = AnalyzeElement(item, depth + 1);
                    metrics = metrics.Combine(nested);
                }

                break;
        }

        return metrics;
    }

    private readonly record struct JsonToolkitCommand(string Operation, string JsonPayload);

    private sealed class JsonAnalysisMetrics
    {
        public int PropertyCount { get; set; }
        public int NestingDepth { get; set; }
        public int ArrayCount { get; set; }
        public int ObjectCount { get; set; }

        public JsonAnalysisMetrics Combine(JsonAnalysisMetrics other)
        {
            return new JsonAnalysisMetrics
            {
                PropertyCount = PropertyCount + other.PropertyCount,
                NestingDepth = Math.Max(NestingDepth, other.NestingDepth),
                ArrayCount = ArrayCount + other.ArrayCount,
                ObjectCount = ObjectCount + other.ObjectCount
            };
        }
    }
}
