namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class GenerationSandboxReportEntity
{
    public Guid ReportId { get; set; } = Guid.NewGuid();
    public Guid DraftId { get; set; }
    public bool Passed { get; set; }
    public string ExecutionBehavior { get; set; } = string.Empty;
    public string PerformanceMetricsJson { get; set; } = "{}";
    public string ConformanceCompliance { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = "default";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
