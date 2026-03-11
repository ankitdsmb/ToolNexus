using ToolNexus.Application.Contracts;

namespace ToolNexus.Application.Services;

public interface IToolCatalogService
{
    IReadOnlyCollection<ToolCatalogItemDto> GetAllTools();
    IReadOnlyCollection<string> GetAllCategories();
    ToolCatalogItemDto? GetBySlug(string slug);
    IReadOnlyCollection<ToolCatalogItemDto> GetByCategory(string category);
    bool CategoryExists(string category);
}
