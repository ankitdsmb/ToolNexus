namespace ToolNexus.Application.Models;

public sealed record AdminAnalyticsDashboard(
    long TotalExecutionsToday,
    double SuccessRate,
    double AvgDurationMs,
    int ActiveToolsCount,
    IReadOnlyList<AdminAnalyticsToolMetric> TopTools,
    IReadOnlyList<AdminAnalyticsToolMetric> SlowTools,
    IReadOnlyList<AdminAnalyticsTrendPoint> ExecutionTrend,
    IReadOnlyList<ToolAnomalySnapshot> IntelligenceAlerts);

public sealed record AdminAnalyticsQuery(
    DateOnly StartDate,
    DateOnly EndDate,
    string? ToolSlug,
    int Page,
    int PageSize);

public sealed record AdminAnalyticsDrilldownResult(
    AdminAnalyticsQuery Query,
    int TotalItems,
    IReadOnlyList<AdminAnalyticsDrilldownRow> Items);

public sealed record AdminAnalyticsToolDetail(
    string ToolSlug,
    DateOnly StartDate,
    DateOnly EndDate,
    long TotalExecutions,
    long TotalFailures,
    double SuccessRate,
    double AvgDurationMs,
    IReadOnlyList<AdminAnalyticsDrilldownRow> DailyRows);

public sealed record AdminAnalyticsDrilldownRow(
    string ToolSlug,
    DateOnly Date,
    long TotalExecutions,
    double SuccessRate,
    double AvgDurationMs,
    long FailureCount);

public sealed record AdminAnalyticsToolMetric(
    string ToolSlug,
    long TotalExecutions,
    double SuccessRate,
    double AvgDurationMs);

public sealed record AdminAnalyticsTrendPoint(
    DateOnly Date,
    long TotalExecutions,
    double SuccessRate,
    double AvgDurationMs);

public enum ToolAnomalyType
{
    LatencySpike,
    FailureSpike,
    UsageDrop
}

public enum ToolAnomalySeverity
{
    Info,
    Warning,
    Critical
}

public sealed record ToolAnomalySnapshot(
    string ToolSlug,
    DateOnly Date,
    ToolAnomalyType Type,
    ToolAnomalySeverity Severity,
    string Description);
