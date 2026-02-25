using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface ICapabilityMarketplaceService
{
    Task<IReadOnlyCollection<CapabilityRegistryEntry>> GetInstalledCapabilities(CancellationToken cancellationToken = default);
}
