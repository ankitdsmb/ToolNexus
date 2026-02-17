using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolCatalogService(IToolManifestRepository manifestRepository) : IToolCatalogService
{
    private readonly Lazy<IReadOnlyCollection<ToolDescriptor>> _tools = new(manifestRepository.LoadTools);

    public IReadOnlyCollection<ToolDescriptor> GetAllTools() => _tools.Value;

    public IReadOnlyCollection<string> GetAllCategories() =>
        _tools.Value
            .Select(x => x.Category)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

    public ToolDescriptor? GetBySlug(string slug) =>
        _tools.Value.FirstOrDefault(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyCollection<ToolDescriptor> GetByCategory(string category) =>
        _tools.Value.Where(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

    public bool CategoryExists(string category) =>
        _tools.Value.Any(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
}
