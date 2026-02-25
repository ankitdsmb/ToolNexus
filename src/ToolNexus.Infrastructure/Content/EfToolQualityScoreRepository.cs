using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfToolQualityScoreRepository(ToolNexusContentDbContext dbContext) : IToolQualityScoreRepository
{
    public async Task AddAsync(ToolQualityScoreRecord score, CancellationToken cancellationToken)
    {
        var entity = new Content.Entities.ToolQualityScoreEntity
        {
            ToolId = score.ToolId,
            Score = score.Score,
            ArchitectureScore = score.ArchitectureScore,
            TestCoverageScore = score.TestCoverageScore,
            CraftScore = score.CraftScore,
            TimestampUtc = score.TimestampUtc
        };

        await dbContext.ToolQualityScores.AddAsync(entity, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<ToolQualityScoreRecord?> GetLatestByToolIdAsync(string toolId, CancellationToken cancellationToken)
    {
        return await dbContext.ToolQualityScores
            .AsNoTracking()
            .Where(x => x.ToolId == toolId)
            .OrderByDescending(x => x.TimestampUtc)
            .Select(x => new ToolQualityScoreRecord(x.ToolId, x.Score, x.ArchitectureScore, x.TestCoverageScore, x.CraftScore, x.TimestampUtc))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ToolQualityScoreDashboard> GetDashboardAsync(ToolQualityScoreQuery query, CancellationToken cancellationToken)
    {
        var normalizedLimit = Math.Clamp(query.Limit, 1, 500);

        var baseQuery = dbContext.ToolQualityScores
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.ToolId))
        {
            baseQuery = baseQuery.Where(x => x.ToolId == query.ToolId);
        }

        if (query.StartDateUtc.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.TimestampUtc >= query.StartDateUtc.Value);
        }

        if (query.EndDateUtc.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.TimestampUtc <= query.EndDateUtc.Value);
        }

        var items = await baseQuery
            .OrderByDescending(x => x.TimestampUtc)
            .Take(normalizedLimit)
            .Select(x => new ToolQualityScoreRecord(x.ToolId, x.Score, x.ArchitectureScore, x.TestCoverageScore, x.CraftScore, x.TimestampUtc))
            .ToListAsync(cancellationToken);

        var latestByTool = await baseQuery
            .GroupBy(x => x.ToolId)
            .Select(g => g.OrderByDescending(x => x.TimestampUtc).First())
            .OrderByDescending(x => x.TimestampUtc)
            .Take(normalizedLimit)
            .Select(x => new ToolQualityScoreRecord(x.ToolId, x.Score, x.ArchitectureScore, x.TestCoverageScore, x.CraftScore, x.TimestampUtc))
            .ToListAsync(cancellationToken);

        return new ToolQualityScoreDashboard(items, latestByTool);
    }
}
