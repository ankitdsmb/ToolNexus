using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace ToolNexus.Web.Services;

public sealed class ToolManifestLoader(ILogger<ToolManifestLoader> logger, IWebHostEnvironment hostEnvironment) : IToolManifestLoader
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly string manifestDirectory = Path.Combine(hostEnvironment.ContentRootPath, "App_Data", "tool-manifests");

    public IReadOnlyCollection<ToolManifest> LoadAll()
    {
        if (!Directory.Exists(manifestDirectory))
        {
            logger.LogWarning("Tool manifest directory was not found: {ManifestDirectory}", manifestDirectory);
            return [];
        }

        var manifests = new List<ToolManifest>();
        var seenSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var filePath in Directory.EnumerateFiles(manifestDirectory, "*.json").OrderBy(path => path, StringComparer.OrdinalIgnoreCase))
        {
            ToolManifest? manifest;

            try
            {
                var json = File.ReadAllText(filePath);
                manifest = JsonSerializer.Deserialize<ToolManifest>(json, SerializerOptions);
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "Skipping invalid tool manifest JSON file: {ManifestFile}", filePath);
                continue;
            }
            catch (IOException ex)
            {
                logger.LogWarning(ex, "Skipping unreadable tool manifest file: {ManifestFile}", filePath);
                continue;
            }

            if (manifest is null || string.IsNullOrWhiteSpace(manifest.Slug) || string.IsNullOrWhiteSpace(manifest.ViewName))
            {
                logger.LogWarning("Skipping invalid tool manifest missing required fields: {ManifestFile}", filePath);
                continue;
            }

            if (!seenSlugs.Add(manifest.Slug))
            {
                throw new InvalidOperationException($"Duplicate tool manifest slug detected: '{manifest.Slug}'.");
            }

            manifests.Add(manifest);
        }

        return manifests;
    }
}
