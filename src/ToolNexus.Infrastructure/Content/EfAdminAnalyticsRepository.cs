using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Content.Entities;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminAnalyticsRepository(ToolNexusContentDbContext dbContext) : IAdminAnalyticsRepository
{
    public async Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
    {
        var startDate = startDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDate = endDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        return await dbContext.DailyToolMetrics
            .AsNoTracking()
            .Where(x => x.DateUtc >= startDate && x.DateUtc <= endDate)
            .Select(x => new DailyToolMetricsSnapshot(
                x.ToolSlug,
                DateOnly.FromDateTime(x.DateUtc),
                x.TotalExecutions,
                x.SuccessCount,
                x.AvgDurationMs))
            .ToListAsync(cancellationToken);
    }


    public async Task<(IReadOnlyList<DailyToolMetricsSnapshot> Items, int TotalItems)> QueryAsync(AdminAnalyticsQuery query, CancellationToken cancellationToken)
    {
        var startDate = query.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDate = query.EndDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var source = dbContext.DailyToolMetrics
            .AsNoTracking()
            .Where(x => x.DateUtc >= startDate && x.DateUtc <= endDate);

        if (!string.IsNullOrWhiteSpace(query.ToolSlug))
        {
            source = source.Where(x => x.ToolSlug == query.ToolSlug);
        }

        var totalItems = await source.CountAsync(cancellationToken);
        var offset = (query.Page - 1) * query.PageSize;

        var items = await source
            .OrderByDescending(x => x.DateUtc)
            .ThenBy(x => x.ToolSlug)
            .Skip(offset)
            .Take(query.PageSize)
            .Select(x => new DailyToolMetricsSnapshot(
                x.ToolSlug,
                DateOnly.FromDateTime(x.DateUtc),
                x.TotalExecutions,
                x.SuccessCount,
                x.AvgDurationMs))
            .ToListAsync(cancellationToken);

        return (items, totalItems);
    }

    public async Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken)
    {
        var dateUtc = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        await dbContext.ToolAnomalySnapshots
            .Where(x => x.DateUtc == dateUtc)
            .ExecuteDeleteAsync(cancellationToken);

        if (anomalies.Count == 0)
        {
            return;
        }

        var entities = anomalies.Select(x => new ToolAnomalySnapshotEntity
        {
            ToolSlug = x.ToolSlug,
            DateUtc = dateUtc,
            Type = x.Type.ToString(),
            Severity = x.Severity.ToString(),
            Description = x.Description
        });

        await dbContext.ToolAnomalySnapshots.AddRangeAsync(entities, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ToolAnomalySnapshot>> GetAnomaliesByDateAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var dateUtc = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        return await dbContext.ToolAnomalySnapshots
            .AsNoTracking()
            .Where(x => x.DateUtc == dateUtc)
            .OrderBy(x => x.ToolSlug)
            .ThenBy(x => x.Type)
            .Select(x => new ToolAnomalySnapshot(
                x.ToolSlug,
                DateOnly.FromDateTime(x.DateUtc),
                Enum.Parse<ToolAnomalyType>(x.Type),
                Enum.Parse<ToolAnomalySeverity>(x.Severity),
                x.Description))
            .ToListAsync(cancellationToken);
    }
}
