namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class GenerationDecisionEntity
{
    public Guid DecisionId { get; set; } = Guid.NewGuid();
    public Guid DraftId { get; set; }
    public string OperatorId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string DecisionReason { get; set; } = string.Empty;
    public string TelemetryEventName { get; set; } = string.Empty;
    public string GovernanceDecisionId { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = "default";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
