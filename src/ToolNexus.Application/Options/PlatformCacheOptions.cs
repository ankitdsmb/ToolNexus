namespace ToolNexus.Application.Options;

public sealed class PlatformCacheOptions
{
    public const string SectionName = "PlatformCache";

    public int ToolMetadataTtlSeconds { get; init; } = 60;
    public int ExecutionPoliciesTtlSeconds { get; init; } = 30;
    public int AnalyticsDashboardTtlSeconds { get; init; } = 30;
    public int DailyMetricsSnapshotsTtlSeconds { get; init; } = 30;
}
