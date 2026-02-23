using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Content;

public sealed class CachingAdminAnalyticsRepository(
    EfAdminAnalyticsRepository inner,
    IPlatformCacheService cache,
    IOptions<PlatformCacheOptions> options) : IAdminAnalyticsRepository
{
    private const string SnapshotRangePrefix = "platform:analytics:snapshots:";
    private const string AnomaliesDatePrefix = "platform:analytics:anomalies:";
    private const string DashboardKey = "platform:analytics:dashboard";

    private readonly TimeSpan _snapshotTtl = TimeSpan.FromSeconds(options.Value.DailyMetricsSnapshotsTtlSeconds);

    public Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
    {
        var key = $"{SnapshotRangePrefix}{startDateInclusive:yyyyMMdd}:{endDateInclusive:yyyyMMdd}";
        return cache.GetOrCreateAsync(key, token => inner.GetByDateRangeAsync(startDateInclusive, endDateInclusive, token), _snapshotTtl, cancellationToken);
    }

    public async Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken)
    {
        await inner.ReplaceAnomaliesForDateAsync(date, anomalies, cancellationToken);
        cache.Remove($"{AnomaliesDatePrefix}{date:yyyyMMdd}");
        cache.Remove(DashboardKey);
        cache.RemoveByPrefix(SnapshotRangePrefix);
    }

    public Task<IReadOnlyList<ToolAnomalySnapshot>> GetAnomaliesByDateAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var key = $"{AnomaliesDatePrefix}{date:yyyyMMdd}";
        return cache.GetOrCreateAsync(key, token => inner.GetAnomaliesByDateAsync(date, token), _snapshotTtl, cancellationToken);
    }
}
