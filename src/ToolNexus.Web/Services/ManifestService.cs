using System.Text.Json;
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
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        var tools = TryLoadV1(json, options);
        if (tools.Count == 0)
        {
            tools = TryLoadLegacy(json, options);
        }

        Validate(tools);
        return tools;
    }

    private static List<ToolDefinition> TryLoadV1(string json, JsonSerializerOptions options)
    {
        var manifest = JsonSerializer.Deserialize<ToolManifestDocument>(json, options);
        if (manifest?.Tools is null || manifest.Tools.Count == 0)
        {
            return [];
        }

        return manifest.Tools.Select(MapV1).ToList();
    }

    private static List<ToolDefinition> TryLoadLegacy(string json, JsonSerializerOptions options)
    {
        var manifest = JsonSerializer.Deserialize<LegacyToolManifestDocument>(json, options)
            ?? throw new InvalidOperationException("Tool manifest payload is invalid.");

        return manifest.Tools.Select(MapLegacy).ToList();
    }

    private static ToolDefinition MapV1(ToolManifestItem tool) => new()
    {
        Slug = tool.Slug,
        Title = tool.Name,
        Category = tool.Category,
        Actions = tool.Actions.Select(x => x.Name).ToList(),
        SeoTitle = string.IsNullOrWhiteSpace(tool.SeoTitle) ? tool.Name : tool.SeoTitle,
        SeoDescription = string.IsNullOrWhiteSpace(tool.SeoDescription) ? tool.Description : tool.SeoDescription,
        ExampleInput = tool.ExampleInput,
        SupportsClientExecution = tool.Capabilities.SupportsClientExecution,
        ClientSafeActions = tool.Capabilities.SupportsClientExecution
            ? tool.Actions.Select(x => x.Name).ToList()
            : []
    };

    private static ToolDefinition MapLegacy(LegacyToolDefinition tool) => new()
    {
        Slug = tool.Slug,
        Title = tool.Title,
        Category = tool.Category,
        Actions = tool.Actions,
        SeoTitle = tool.SeoTitle,
        SeoDescription = tool.SeoDescription,
        ExampleInput = tool.ExampleInput,
        SupportsClientExecution = tool.ClientSafeActions.Count > 0,
        ClientSafeActions = tool.ClientSafeActions
    };

    private static void Validate(IReadOnlyCollection<ToolDefinition> tools)
    {
        var slugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var tool in tools)
        {
            if (!slugs.Add(tool.Slug))
            {
                throw new InvalidOperationException($"Duplicate tool slug '{tool.Slug}' in manifest.");
            }

            if (tool.Actions.Count == 0)
            {
                throw new InvalidOperationException($"Tool '{tool.Slug}' has no actions.");
            }
        }
    }
}
