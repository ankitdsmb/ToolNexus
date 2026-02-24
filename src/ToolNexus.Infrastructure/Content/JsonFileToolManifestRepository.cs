using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Content;

public sealed class JsonFileToolManifestRepository(
    IHostEnvironment hostEnvironment,
    IConfiguration configuration,
    ILogger<JsonFileToolManifestRepository> logger) : IToolManifestRepository
{
    public IReadOnlyCollection<ToolDescriptor> LoadTools()
    {
        var path = configuration["ManifestPath"]
                   ?? Path.GetFullPath(Path.Combine(hostEnvironment.ContentRootPath, "../../tools.manifest.json"));

        if (!File.Exists(path))
        {
            logger.LogWarning("{Category} manifest file missing at {ManifestPath}.", "ToolSync", path);
            return [];
        }

        try
        {
            var json = File.ReadAllText(path);
            var manifest = JsonSerializer.Deserialize<ToolManifestDocument>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return manifest?.Tools ?? [];
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{Category} failed loading manifest from {ManifestPath}.", "ToolSync", path);
            return [];
        }
    }

    private sealed class ToolManifestDocument
    {
        public List<ToolDescriptor> Tools { get; init; } = [];
    }
}
