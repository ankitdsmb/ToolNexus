namespace ToolNexus.Application.Models;

public sealed record AdminAnalyticsDashboard(
    long TotalExecutionsToday,
    double SuccessRate,
    double AvgDurationMs,
    int ActiveToolsCount,
    IReadOnlyList<AdminAnalyticsToolMetric> TopTools,
    IReadOnlyList<AdminAnalyticsToolMetric> SlowTools,
    IReadOnlyList<AdminAnalyticsTrendPoint> ExecutionTrend);

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

