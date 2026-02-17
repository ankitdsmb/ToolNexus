using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolManifestCatalog
{
    IReadOnlyCollection<ToolManifestV1> GetAll();
    ToolManifestV1? GetBySlug(string slug);
}
