namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class DailyToolMetricsEntity
{
    public long Id { get; set; }
    public string ToolSlug { get; set; } = string.Empty;
    public DateTimeOffset DateUtc { get; set; }
    public long TotalExecutions { get; set; }
    public long SuccessCount { get; set; }
    public long FailureCount { get; set; }
    public double AvgDurationMs { get; set; }
    public long MaxDurationMs { get; set; }
    public long TotalPayloadSize { get; set; }
}
