using ToolNexus.Application.Contracts;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolCatalogService(IToolManifestRepository manifestRepository) : IToolCatalogService
{
    public IReadOnlyCollection<ToolCatalogItemDto> GetAllTools() =>
        manifestRepository.LoadTools().Select(ToCatalogItem).ToList();

    public IReadOnlyCollection<string> GetAllCategories() =>
        manifestRepository
            .LoadTools()
            .Select(x => x.Category)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

    public ToolCatalogItemDto? GetBySlug(string slug) =>
        manifestRepository
            .LoadTools()
            .Where(x => x.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase))
            .Select(ToCatalogItem)
            .FirstOrDefault();

    public IReadOnlyCollection<ToolCatalogItemDto> GetByCategory(string category) =>
        manifestRepository
            .LoadTools()
            .Where(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .Select(ToCatalogItem)
            .ToList();

    private static ToolCatalogItemDto ToCatalogItem(ToolDescriptor descriptor) =>
        new(
            descriptor.Slug,
            descriptor.Title,
            descriptor.Category,
            descriptor.Actions,
            descriptor.SeoTitle,
            descriptor.SeoDescription,
            descriptor.ExampleInput,
            descriptor.ClientSafeActions,
            descriptor.Version,
            descriptor.IsDeterministic,
            descriptor.IsCpuIntensive,
            descriptor.IsCacheable,
            descriptor.SecurityLevel,
            descriptor.RequiresAuthentication,
            descriptor.IsDeprecated,
            descriptor.RuntimeLanguage,
            descriptor.ExecutionCapability,
            descriptor.OperationSchema);

    public bool CategoryExists(string category) =>
        manifestRepository.LoadTools().Any(x => x.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
}
