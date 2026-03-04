using System.Text.Json;

namespace ToolNexus.Api.Services.AIGenerator;

public sealed class ToolManifestGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public string Generate(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new ArgumentException("Slug is required.", nameof(slug));
        }

        var manifest = new ToolManifestArtifact(slug, "schema");
        return JsonSerializer.Serialize(manifest, JsonOptions);
    }

    private sealed record ToolManifestArtifact(string Slug, string Type);
}
