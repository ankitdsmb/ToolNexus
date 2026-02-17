using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Content;

public sealed class JsonFileToolManifestRepository(IHostEnvironment hostEnvironment, IConfiguration configuration) : IToolManifestRepository
{
    public IReadOnlyCollection<ToolDescriptor> LoadTools()
    {
        var path = configuration["ManifestPath"]
                   ?? Path.GetFullPath(Path.Combine(hostEnvironment.ContentRootPath, "../../tools.manifest.json"));

        var json = File.ReadAllText(path);
        var manifest = JsonSerializer.Deserialize<ToolManifestDocument>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return manifest?.Tools ?? [];
    }

    private sealed class ToolManifestDocument
    {
        public List<ToolDescriptor> Tools { get; init; } = [];
    }
}
