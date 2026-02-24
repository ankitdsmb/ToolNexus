using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminAnalyticsRepository(IDbContextFactory<ToolNexusContentDbContext> dbContextFactory) : IAdminAnalyticsRepository
{
    public async Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
        => await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var startDate = startDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endDate = endDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

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
        }, [], cancellationToken);


    public async Task<(IReadOnlyList<DailyToolMetricsSnapshot> Items, int TotalItems)> QueryAsync(AdminAnalyticsQuery query, CancellationToken cancellationToken)
        => await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var startDate = query.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endDate = query.EndDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

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

            return ((IReadOnlyList<DailyToolMetricsSnapshot>)items, totalItems);
        }, ([], 0), cancellationToken);

    public async Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken)
        => await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

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
        }, cancellationToken);

    public async Task<IReadOnlyList<ToolAnomalySnapshot>> GetAnomaliesByDateAsync(DateOnly date, CancellationToken cancellationToken)
        => await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

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
        }, [], cancellationToken);

    private async Task ExecuteWithSchemaRecoveryAsync(Func<Task> action, CancellationToken cancellationToken)
    {
        _ = await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            await action();
            return true;
        }, false, cancellationToken);
    }

    private async Task<T> ExecuteWithSchemaRecoveryAsync<T>(Func<Task<T>> action, T fallback, CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn)
        {
            return await RetryAfterMigrationAsync(action, fallback, cancellationToken);
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 1
                                         && (ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase)
                                             || ex.Message.Contains("no such column", StringComparison.OrdinalIgnoreCase)))
        {
            return await RetryAfterMigrationAsync(action, fallback, cancellationToken);
        }
    }

    private async Task<T> RetryAfterMigrationAsync<T>(Func<Task<T>> action, T fallback, CancellationToken cancellationToken)
    {
        try
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await dbContext.Database.MigrateAsync(cancellationToken);
            return await action();
        }
        catch
        {
            return fallback;
        }
    }
}
