using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolIntelligenceService(IAdminAnalyticsRepository repository) : IToolIntelligenceService
{
    internal const double LatencySpikeMultiplier = 1.5;
    internal const double FailureSpikeMultiplier = 2.0;
    internal const double UsageDropMultiplier = 0.5;
    private const int BaselineDays = 7;

    public async Task<IReadOnlyList<ToolAnomalySnapshot>> DetectAndPersistDailyAnomaliesAsync(DateOnly date, CancellationToken cancellationToken)
    {
        var startDate = date.AddDays(-BaselineDays);
        var snapshots = await repository.GetByDateRangeAsync(startDate, date, cancellationToken);

        var anomalies = snapshots
            .GroupBy(x => x.ToolSlug, StringComparer.OrdinalIgnoreCase)
            .SelectMany(group => DetectToolAnomalies(group.Key, date, group.ToList()))
            .OrderBy(x => x.ToolSlug, StringComparer.Ordinal)
            .ThenBy(x => x.Type)
            .ToList();

        await repository.ReplaceAnomaliesForDateAsync(date, anomalies, cancellationToken);
        return anomalies;
    }

    private static IReadOnlyList<ToolAnomalySnapshot> DetectToolAnomalies(string toolSlug, DateOnly date, IReadOnlyList<DailyToolMetricsSnapshot> snapshots)
    {
        var today = snapshots.SingleOrDefault(x => x.Date == date);
        if (today is null)
        {
            return [];
        }

        var baseline = snapshots
            .Where(x => x.Date < date)
            .OrderByDescending(x => x.Date)
            .Take(BaselineDays)
            .ToList();

        if (baseline.Count == 0)
        {
            return [];
        }

        var avgLatency = baseline.Average(x => x.AvgDurationMs);
        var avgFailureRate = baseline.Average(GetFailureRate);
        var avgExecutions = baseline.Average(x => x.TotalExecutions);

        var results = new List<ToolAnomalySnapshot>();

        if (avgLatency > 0 && today.AvgDurationMs > avgLatency * LatencySpikeMultiplier)
        {
            var severity = today.AvgDurationMs > avgLatency * 2.5 ? ToolAnomalySeverity.Critical : ToolAnomalySeverity.Warning;
            results.Add(new ToolAnomalySnapshot(
                toolSlug,
                date,
                ToolAnomalyType.LatencySpike,
                severity,
                $"Average latency increased to {today.AvgDurationMs:F1} ms from 7-day average {avgLatency:F1} ms."));
        }

        var todayFailureRate = GetFailureRate(today);
        if (avgFailureRate > 0 && todayFailureRate > avgFailureRate * FailureSpikeMultiplier)
        {
            var severity = todayFailureRate > avgFailureRate * 3 ? ToolAnomalySeverity.Critical : ToolAnomalySeverity.Warning;
            results.Add(new ToolAnomalySnapshot(
                toolSlug,
                date,
                ToolAnomalyType.FailureSpike,
                severity,
                $"Failure rate rose to {todayFailureRate:P1} from 7-day average {avgFailureRate:P1}."));
        }

        if (avgExecutions > 0 && today.TotalExecutions < avgExecutions * UsageDropMultiplier)
        {
            var severity = today.TotalExecutions < avgExecutions * 0.25 ? ToolAnomalySeverity.Critical : ToolAnomalySeverity.Info;
            results.Add(new ToolAnomalySnapshot(
                toolSlug,
                date,
                ToolAnomalyType.UsageDrop,
                severity,
                $"Executions dropped to {today.TotalExecutions} from 7-day average {avgExecutions:F1}."));
        }

        return results;
    }

    private static double GetFailureRate(DailyToolMetricsSnapshot snapshot)
        => snapshot.TotalExecutions == 0 ? 0d : (double)(snapshot.TotalExecutions - snapshot.SuccessCount) / snapshot.TotalExecutions;
}
