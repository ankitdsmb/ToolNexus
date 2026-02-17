using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolManifestGovernance
{
    IReadOnlyCollection<ToolManifest> GetAll();
    ToolManifest? FindBySlug(string slug);
}
