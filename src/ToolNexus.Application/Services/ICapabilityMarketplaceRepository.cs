using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface ICapabilityMarketplaceRepository
{
    Task UpsertAsync(IReadOnlyCollection<CapabilityRegistryEntry> entries, DateTime syncedAtUtc, CancellationToken cancellationToken);
    Task<CapabilityMarketplaceDashboard> GetDashboardAsync(CapabilityMarketplaceQuery query, CancellationToken cancellationToken);
    Task<CapabilityRegistryEntry?> GetByCapabilityIdAsync(string capabilityId, CancellationToken cancellationToken);
}
