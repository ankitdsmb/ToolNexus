using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAiToolPackageRepository(ToolNexusContentDbContext dbContext) : IAiToolPackageRepository
{
    public Task<bool> ExistsBySlugAsync(string slug, CancellationToken cancellationToken)
        => dbContext.AiToolPackages.AnyAsync(x => x.Slug == slug, cancellationToken);

    public async Task<AiToolPackageRecord> CreateAsync(AiToolPackageContract contract, string correlationId, string tenantId, CancellationToken cancellationToken)
    {
        var entity = new AiToolPackageEntity
        {
            Slug = contract.Slug,
            Status = AiToolPackageStatus.Draft.ToString(),
            JsonPayload = contract.RawJsonPayload,
            CorrelationId = correlationId,
            TenantId = tenantId,
            CreatedUtc = DateTime.UtcNow,
            UpdatedUtc = DateTime.UtcNow,
            Version = 1
        };

        dbContext.AiToolPackages.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<AiToolPackageRecord?> GetBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var entity = await dbContext.AiToolPackages.AsNoTracking()
            .OrderByDescending(x => x.UpdatedUtc)
            .FirstOrDefaultAsync(x => x.Slug == slug, cancellationToken);

        return entity is null ? null : Map(entity);
    }

    private static AiToolPackageRecord Map(AiToolPackageEntity entity)
        => new(entity.Id, entity.Slug, Enum.Parse<AiToolPackageStatus>(entity.Status, true), entity.JsonPayload, entity.CreatedUtc, entity.UpdatedUtc, entity.Version);
}
