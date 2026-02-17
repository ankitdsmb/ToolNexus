using System.Text.Json;
using ToolNexus.Application.Models;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public interface IManifestService
{
    IReadOnlyCollection<ToolDefinition> GetAllTools();
    IReadOnlyCollection<string> GetAllCategories();
    ToolDefinition? GetBySlug(string slug);
    IReadOnlyCollection<ToolDefinition> GetByCategory(string category);
    bool CategoryExists(string category);
}

public sealed class ManifestService : IManifestService
{
    private readonly Lazy<IReadOnlyCollection<ToolDefinition>> _tools;

    public ManifestService(IWebHostEnvironment env, IConfiguration configuration)
    {
        _tools = new Lazy<IReadOnlyCollection<ToolDefinition>>(() => LoadTools(env, configuration));
    }

    public IReadOnlyCollection<ToolDefinition> GetAllTools() => _tools.Value;

    public IReadOnlyCollection<string> GetAllCategories() =>
        _tools.Value
            .Select(x => x.Category)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

    public ToolDefinition? GetBySlug(string slug) => _tools.Value.FirstOrDefault(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyCollection<ToolDefinition> GetByCategory(string category) => _tools.Value.Where(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

    public bool CategoryExists(string category) => _tools.Value.Any(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyCollection<ToolDefinition> LoadTools(IWebHostEnvironment env, IConfiguration configuration)
    {
        var path = configuration["ManifestPath"] ?? Path.GetFullPath(Path.Combine(env.ContentRootPath, "../../tools.manifest.json"));
        var json = File.ReadAllText(path);
        var manifest = JsonSerializer.Deserialize<ToolManifest>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return manifest?.Tools ?? [];
    }
}
