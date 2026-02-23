using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AdminAnalyticsService(IAdminAnalyticsRepository repository) : IAdminAnalyticsService
{
    private const int TopToolCount = 5;
    private const int SlowToolCount = 5;
    private const int TrendDays = 14;

    public async Task<AdminAnalyticsDashboard> GetDashboardAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var trendStart = today.AddDays(-(TrendDays - 1));
        var snapshotsTask = repository.GetByDateRangeAsync(trendStart, today, cancellationToken);
        var alertsTask = repository.GetAnomaliesByDateAsync(today, cancellationToken);
        await Task.WhenAll(snapshotsTask, alertsTask);

        var snapshots = snapshotsTask.Result;

        var todayRows = snapshots.Where(x => x.Date == today && x.TotalExecutions > 0).ToList();
        var totalExecutionsToday = todayRows.Sum(x => x.TotalExecutions);
        var totalSuccessToday = todayRows.Sum(x => x.SuccessCount);
        var successRate = totalExecutionsToday == 0 ? 0d : (double)totalSuccessToday / totalExecutionsToday * 100d;
        var weightedDurationSum = todayRows.Sum(x => x.AvgDurationMs * x.TotalExecutions);
        var avgDuration = totalExecutionsToday == 0 ? 0d : weightedDurationSum / totalExecutionsToday;
        var activeToolsCount = todayRows.Select(x => x.ToolSlug).Distinct(StringComparer.OrdinalIgnoreCase).Count();

        var topTools = todayRows
            .OrderByDescending(x => x.TotalExecutions)
            .ThenBy(x => x.ToolSlug, StringComparer.Ordinal)
            .Take(TopToolCount)
            .Select(MapTool)
            .ToList();

        var slowTools = todayRows
            .OrderByDescending(x => x.AvgDurationMs)
            .ThenByDescending(x => x.TotalExecutions)
            .ThenBy(x => x.ToolSlug, StringComparer.Ordinal)
            .Take(SlowToolCount)
            .Select(MapTool)
            .ToList();

        var trend = snapshots
            .GroupBy(x => x.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var executions = g.Sum(x => x.TotalExecutions);
                var success = g.Sum(x => x.SuccessCount);
                var duration = g.Sum(x => x.AvgDurationMs * x.TotalExecutions);
                var trendSuccessRate = executions == 0 ? 0d : (double)success / executions * 100d;
                var trendAvgDuration = executions == 0 ? 0d : duration / executions;
                return new AdminAnalyticsTrendPoint(g.Key, executions, trendSuccessRate, trendAvgDuration);
            })
            .ToList();

        return new AdminAnalyticsDashboard(totalExecutionsToday, successRate, avgDuration, activeToolsCount, topTools, slowTools, trend, alertsTask.Result);
    }

    private static AdminAnalyticsToolMetric MapTool(DailyToolMetricsSnapshot row)
    {
        var successRate = row.TotalExecutions == 0 ? 0d : (double)row.SuccessCount / row.TotalExecutions * 100d;
        return new AdminAnalyticsToolMetric(row.ToolSlug, row.TotalExecutions, successRate, row.AvgDurationMs);
    }
}
