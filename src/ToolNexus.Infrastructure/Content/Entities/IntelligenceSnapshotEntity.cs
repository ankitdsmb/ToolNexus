namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class IntelligenceSnapshotEntity
{
    public Guid SnapshotId { get; set; }
    public string SnapshotType { get; set; } = "materialized";
    public string LifecycleVersion { get; set; } = "v1";
    public string TenantId { get; set; } = "global";
    public string CorrelationId { get; set; } = string.Empty;
    public DateTime SnapshotAtUtc { get; set; }
    public string NodeCountByTypeJson { get; set; } = "{}";
    public string EdgeCountByTypeJson { get; set; } = "{}";
    public string IntegrityStatus { get; set; } = "pending";
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
