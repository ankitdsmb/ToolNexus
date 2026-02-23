using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminAnalyticsRepository
{
    Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken);
    Task<(IReadOnlyList<DailyToolMetricsSnapshot> Items, int TotalItems)> QueryAsync(AdminAnalyticsQuery query, CancellationToken cancellationToken);
    Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken);
    Task<IReadOnlyList<ToolAnomalySnapshot>> GetAnomaliesByDateAsync(DateOnly date, CancellationToken cancellationToken);
}

public sealed record DailyToolMetricsSnapshot(
    string ToolSlug,
    DateOnly Date,
    long TotalExecutions,
    long SuccessCount,
    double AvgDurationMs);
