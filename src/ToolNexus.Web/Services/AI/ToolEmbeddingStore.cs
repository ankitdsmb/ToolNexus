using System.Text.Json;

namespace ToolNexus.Web.Services.AI;

public sealed class ToolEmbeddingStore
{
    private readonly Dictionary<string, float[]> embeddings;
    private readonly int vectorDimension;

    public ToolEmbeddingStore(IWebHostEnvironment hostEnvironment)
    {
        ArgumentNullException.ThrowIfNull(hostEnvironment);

        var embeddingPath = Path.Combine(hostEnvironment.ContentRootPath, "App_Data", "tool-embeddings.json");
        if (!File.Exists(embeddingPath))
        {
            throw new FileNotFoundException($"Tool embedding file was not found at '{embeddingPath}'.", embeddingPath);
        }

        var json = File.ReadAllText(embeddingPath);
        embeddings = ParseEmbeddings(json, embeddingPath);
        vectorDimension = embeddings.Count == 0 ? 0 : embeddings.First().Value.Length;
    }

    public IEnumerable<(string slug, float score)> Rank(float[] queryVector)
    {
        ArgumentNullException.ThrowIfNull(queryVector);

        if (queryVector.Length == 0)
        {
            throw new InvalidOperationException("Query embedding vector must be non-empty.");
        }

        if (vectorDimension == 0)
        {
            return [];
        }

        if (queryVector.Length != vectorDimension)
        {
            throw new InvalidOperationException($"Query embedding dimension mismatch. Expected {vectorDimension}, received {queryVector.Length}.");
        }

        return embeddings
            .Select(pair => (slug: pair.Key, score: CosineSimilarity(queryVector, pair.Value)))
            .OrderByDescending(result => result.score);
    }

    private static Dictionary<string, float[]> ParseEmbeddings(string json, string sourcePath)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            return root.ValueKind switch
            {
                JsonValueKind.Object => ParseObjectShape(root, sourcePath),
                JsonValueKind.Array => ParseArrayShape(root, sourcePath),
                _ => throw new InvalidOperationException($"Tool embedding payload in '{sourcePath}' must be a JSON object or array.")
            };
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException($"Tool embedding payload in '{sourcePath}' is invalid JSON.", ex);
        }
    }

    private static Dictionary<string, float[]> ParseObjectShape(JsonElement root, string sourcePath)
    {
        var result = new Dictionary<string, float[]>(StringComparer.OrdinalIgnoreCase);
        var expectedDimension = -1;

        foreach (var property in root.EnumerateObject())
        {
            var vector = ParseVector(property.Value, property.Name, sourcePath);
            ValidateDimension(property.Name, vector, ref expectedDimension, sourcePath);
            result[property.Name] = vector;
        }

        return result;
    }

    private static Dictionary<string, float[]> ParseArrayShape(JsonElement root, string sourcePath)
    {
        var result = new Dictionary<string, float[]>(StringComparer.OrdinalIgnoreCase);
        var expectedDimension = -1;

        foreach (var item in root.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
            {
                throw new InvalidOperationException($"Tool embedding entry in '{sourcePath}' must be a JSON object.");
            }

            if (!item.TryGetProperty("slug", out var slugElement) || slugElement.ValueKind != JsonValueKind.String)
            {
                throw new InvalidOperationException($"Tool embedding entry in '{sourcePath}' is missing required string property 'slug'.");
            }

            if (!item.TryGetProperty("vector", out var vectorElement))
            {
                throw new InvalidOperationException($"Tool embedding entry in '{sourcePath}' for slug '{slugElement.GetString()}' is missing required property 'vector'.");
            }

            var slug = slugElement.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(slug))
            {
                throw new InvalidOperationException($"Tool embedding entry in '{sourcePath}' contains an empty slug.");
            }

            var vector = ParseVector(vectorElement, slug, sourcePath);
            ValidateDimension(slug, vector, ref expectedDimension, sourcePath);
            result[slug] = vector;
        }

        return result;
    }

    private static float[] ParseVector(JsonElement vectorElement, string slug, string sourcePath)
    {
        if (vectorElement.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException($"Tool embedding vector for slug '{slug}' in '{sourcePath}' must be an array.");
        }

        var values = new List<float>();
        foreach (var value in vectorElement.EnumerateArray())
        {
            if (!value.TryGetSingle(out var parsed))
            {
                throw new InvalidOperationException($"Tool embedding vector for slug '{slug}' in '{sourcePath}' contains a non-numeric value.");
            }

            values.Add(parsed);
        }

        if (values.Count == 0)
        {
            throw new InvalidOperationException($"Tool embedding vector for slug '{slug}' in '{sourcePath}' must be non-empty.");
        }

        return values.ToArray();
    }

    private static void ValidateDimension(string slug, float[] vector, ref int expectedDimension, string sourcePath)
    {
        if (expectedDimension < 0)
        {
            expectedDimension = vector.Length;
            return;
        }

        if (vector.Length != expectedDimension)
        {
            throw new InvalidOperationException($"Tool embedding dimension mismatch for slug '{slug}' in '{sourcePath}'. Expected {expectedDimension}, found {vector.Length}.");
        }
    }

    private static float CosineSimilarity(float[] left, float[] right)
    {
        var dot = 0d;
        var leftMagnitude = 0d;
        var rightMagnitude = 0d;

        for (var i = 0; i < left.Length; i++)
        {
            dot += left[i] * right[i];
            leftMagnitude += left[i] * left[i];
            rightMagnitude += right[i] * right[i];
        }

        if (leftMagnitude <= 0d || rightMagnitude <= 0d)
        {
            return 0f;
        }

        return (float)(dot / (Math.Sqrt(leftMagnitude) * Math.Sqrt(rightMagnitude)));
    }
}
