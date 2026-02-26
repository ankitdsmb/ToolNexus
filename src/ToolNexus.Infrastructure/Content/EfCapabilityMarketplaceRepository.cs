using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfCapabilityMarketplaceRepository(ToolNexusContentDbContext dbContext) : ICapabilityMarketplaceRepository
{
    public async Task UpsertAsync(IReadOnlyCollection<CapabilityRegistryEntry> entries, DateTime syncedAtUtc, CancellationToken cancellationToken)
    {
        var capabilityIds = entries.Select(x => x.CapabilityId).ToArray();
        var existing = await dbContext.CapabilityRegistry
            .Where(x => capabilityIds.Contains(x.CapabilityId))
            .ToDictionaryAsync(x => x.CapabilityId, StringComparer.Ordinal, cancellationToken);

        foreach (var entry in entries)
        {
            if (!existing.TryGetValue(entry.CapabilityId, out var entity))
            {
                entity = new CapabilityRegistryEntity { Id = Guid.NewGuid(), CapabilityId = entry.CapabilityId };
                await dbContext.CapabilityRegistry.AddAsync(entity, cancellationToken);
            }

            entity.Provider = entry.Provider;
            entity.Version = entry.Version;
            entity.ToolId = entry.ToolId;
            entity.RuntimeLanguage = entry.RuntimeLanguage.ToString();
            entity.ComplexityTier = (int)entry.ComplexityTier;
            entity.PermissionsJson = JsonSerializer.Serialize(entry.Permissions);
            entity.Status = (int)entry.Status;
            entity.InstallationState = (int)entry.InstallationState;
            entity.Authority = entry.Governance.Authority.ToString();
            entity.SnapshotId = entry.Governance.SnapshotId;
            entity.PolicyVersionToken = entry.Governance.PolicyVersionToken;
            entity.PolicyExecutionEnabled = entry.Governance.PolicyExecutionEnabled;
            entity.SyncedAtUtc = syncedAtUtc;
            entity.UpdatedAtUtc = syncedAtUtc;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<CapabilityMarketplaceDashboard> GetDashboardAsync(CapabilityMarketplaceQuery query, CancellationToken cancellationToken)
    {
        var normalizedLimit = Math.Clamp(query.Limit, 1, 500);
        var baseQuery = dbContext.CapabilityRegistry.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.ToolId))
            baseQuery = baseQuery.Where(x => x.ToolId == query.ToolId);
        if (query.Status.HasValue)
            baseQuery = baseQuery.Where(x => x.Status == (int)query.Status.Value);
        if (query.SyncedAfterUtc.HasValue)
            baseQuery = baseQuery.Where(x => x.SyncedAtUtc >= query.SyncedAfterUtc.Value);

        var entities = await baseQuery
            .OrderByDescending(x => x.SyncedAtUtc)
            .ThenBy(x => x.ToolId)
            .Take(normalizedLimit)
            .ToListAsync(cancellationToken);

        var items = entities.Select(Map).ToArray();
        var lastSyncedUtc = items.Length == 0 ? DateTime.MinValue : entities.Max(x => x.SyncedAtUtc);
        return new CapabilityMarketplaceDashboard(lastSyncedUtc, items);
    }

    private static CapabilityRegistryEntry Map(CapabilityRegistryEntity entity)
    {
        var permissions = JsonSerializer.Deserialize<string[]>(entity.PermissionsJson) ?? [];
        var capabilityId = entity.CapabilityId;

        return new CapabilityRegistryEntry(
            capabilityId,
            entity.Provider,
            entity.Version,
            entity.ToolId,
            ToolRuntimeLanguage.From(entity.RuntimeLanguage, ToolRuntimeLanguage.DotNet),
            (CapabilityComplexityTier)entity.ComplexityTier,
            permissions,
            (CapabilityRegistryStatus)entity.Status,
            (CapabilityInstallationState)entity.InstallationState,
            new CapabilityToolLink(capabilityId, entity.ToolId),
            new CapabilityGovernanceMetadata(
                Enum.Parse<ExecutionAuthority>(entity.Authority, true),
                entity.SnapshotId,
                entity.PolicyVersionToken,
                entity.PolicyExecutionEnabled));
    }
}
