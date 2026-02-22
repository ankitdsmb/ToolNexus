using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolCatalogService(IToolManifestRepository manifestRepository) : IToolCatalogService
{
    public IReadOnlyCollection<ToolDescriptor> GetAllTools() => manifestRepository.LoadTools();

    public IReadOnlyCollection<string> GetAllCategories() =>
        manifestRepository
            .LoadTools()
            .Select(x => x.Category)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

    public ToolDescriptor? GetBySlug(string slug) =>
        manifestRepository.LoadTools().FirstOrDefault(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

    public IReadOnlyCollection<ToolDescriptor> GetByCategory(string category) =>
        manifestRepository.LoadTools().Where(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();

    public bool CategoryExists(string category) =>
        manifestRepository.LoadTools().Any(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
}
