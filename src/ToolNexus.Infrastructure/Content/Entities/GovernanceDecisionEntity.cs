namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class GovernanceDecisionEntity
{
    public Guid DecisionId { get; set; }
    public string ToolId { get; set; } = string.Empty;
    public string CapabilityId { get; set; } = string.Empty;
    public string Authority { get; set; } = string.Empty;
    public string ApprovedBy { get; set; } = string.Empty;
    public string DecisionReason { get; set; } = string.Empty;
    public string PolicyVersion { get; set; } = string.Empty;
    public DateTime TimestampUtc { get; set; }
    public string Status { get; set; } = string.Empty;

    public ICollection<ExecutionSnapshotEntity> ExecutionSnapshots { get; set; } = [];
}
