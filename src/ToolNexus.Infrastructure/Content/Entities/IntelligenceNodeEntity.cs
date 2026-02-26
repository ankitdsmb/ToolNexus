namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class IntelligenceNodeEntity
{
    public Guid NodeId { get; set; }
    public string NodeType { get; set; } = string.Empty;
    public string ExternalRef { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string LifecycleState { get; set; } = "active";
    public string LifecycleVersion { get; set; } = "v1";
    public string ConfidenceBand { get; set; } = "measured";
    public string TenantId { get; set; } = "global";
    public string CorrelationId { get; set; } = string.Empty;
    public string ContextTagsJson { get; set; } = "[]";
    public string PropertiesJson { get; set; } = "{}";
    public DateTime ObservedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? RetiredAtUtc { get; set; }
}
