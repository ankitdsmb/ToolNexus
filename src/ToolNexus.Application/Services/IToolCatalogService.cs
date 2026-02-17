using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolCatalogService
{
    IReadOnlyCollection<ToolDescriptor> GetAllTools();
    IReadOnlyCollection<string> GetAllCategories();
    ToolDescriptor? GetBySlug(string slug);
    IReadOnlyCollection<ToolDescriptor> GetByCategory(string category);
    bool CategoryExists(string category);
}
