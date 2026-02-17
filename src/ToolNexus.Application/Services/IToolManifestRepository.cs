using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolManifestRepository
{
    IReadOnlyCollection<ToolDescriptor> LoadTools();
}
