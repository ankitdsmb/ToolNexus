using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminAnalyticsRepository(
    IDbContextFactory<ToolNexusContentDbContext> dbContextFactory,
    IDatabaseInitializationState initializationState) : IAdminAnalyticsRepository
{
    public async Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
    {
        await initializationState.WaitForReadyAsync(cancellationToken);

        var startDate = new DateTimeOffset(startDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        var endDate = new DateTimeOffset(endDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var rows = await dbContext.DailyToolMetrics
            .AsNoTracking()
            .Where(x => x.DateUtc >= startDate && x.DateUtc <= endDate)
            .OrderBy(x => x.DateUtc)
            .ThenBy(x => x.ToolSlug)
            .Select(x => new DailyToolMetricsSnapshot(
                x.ToolSlug,
                DateOnly.FromDateTime(x.DateUtc.UtcDateTime),
                x.TotalExecutions,
                x.SuccessCount,
                x.AvgDurationMs))
            .ToListAsync(cancellationToken);

        return rows;
    }

    public async Task<(IReadOnlyList<DailyToolMetricsSnapshot> Items, int TotalItems)> QueryAsync(AdminAnalyticsQuery query, CancellationToken cancellationToken)
    {
        await initializationState.WaitForReadyAsync(cancellationToken);

        var startDate = new DateTimeOffset(query.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        var endDate = new DateTimeOffset(query.EndDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var filteredQuery = dbContext.DailyToolMetrics
            .AsNoTracking()
            .Where(x => x.DateUtc >= startDate && x.DateUtc <= endDate);

        if (!string.IsNullOrWhiteSpace(query.ToolSlug))
        {
            filteredQuery = filteredQuery.Where(x => x.ToolSlug == query.ToolSlug);
        }

        var totalItems = await filteredQuery.CountAsync(cancellationToken);
        var offset = (query.Page - 1) * query.PageSize;

        var items = await filteredQuery
            .OrderByDescending(x => x.DateUtc)
            .ThenBy(x => x.ToolSlug)
            .Skip(offset)
            .Take(query.PageSize)
            .Select(x => new DailyToolMetricsSnapshot(
                x.ToolSlug,
                DateOnly.FromDateTime(x.DateUtc.UtcDateTime),
                x.TotalExecutions,
                x.SuccessCount,
                x.AvgDurationMs))
            .ToListAsync(cancellationToken);

        return (items, totalItems);
    }

    public async Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken)
    {
        await initializationState.WaitForReadyAsync(cancellationToken);

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var dateUtc = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));

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
        await initializationState.WaitForReadyAsync(cancellationToken);

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var dateUtc = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        var rows = await dbContext.ToolAnomalySnapshots
            .AsNoTracking()
            .Where(x => x.DateUtc == dateUtc)
            .OrderBy(x => x.ToolSlug)
            .ThenBy(x => x.Type)
            .Select(x => new { x.ToolSlug, x.DateUtc, x.Type, x.Severity, x.Description })
            .ToListAsync(cancellationToken);

        return rows
            .Select(x => new ToolAnomalySnapshot(
                x.ToolSlug,
                DateOnly.FromDateTime(x.DateUtc.UtcDateTime),
                Enum.Parse<ToolAnomalyType>(x.Type),
                Enum.Parse<ToolAnomalySeverity>(x.Severity),
                x.Description))
            .ToList();
    }
}
