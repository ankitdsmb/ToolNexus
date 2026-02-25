namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ExecutionSnapshotEntity
{
    public Guid Id { get; set; }
    public Guid ExecutionRunId { get; set; }
    public string SnapshotId { get; set; } = string.Empty;
    public string Authority { get; set; } = string.Empty;
    public string RuntimeLanguage { get; set; } = string.Empty;
    public string ExecutionCapability { get; set; } = string.Empty;
    public string? CorrelationId { get; set; }
    public string? TenantId { get; set; }
    public DateTime TimestampUtc { get; set; }
    public string ConformanceVersion { get; set; } = string.Empty;
    public string? PolicySnapshotJson { get; set; }
    public Guid GovernanceDecisionId { get; set; }

    public ExecutionRunEntity ExecutionRun { get; set; } = null!;
    public GovernanceDecisionEntity GovernanceDecision { get; set; } = null!;
}
