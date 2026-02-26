namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class IntelligenceEdgeEntity
{
    public Guid EdgeId { get; set; }
    public Guid SourceNodeId { get; set; }
    public Guid TargetNodeId { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public string LifecycleVersion { get; set; } = "v1";
    public decimal ConfidenceScore { get; set; }
    public string TenantId { get; set; } = "global";
    public string CorrelationId { get; set; } = string.Empty;
    public string ContextTagsJson { get; set; } = "[]";
    public string MetadataJson { get; set; } = "{}";
    public DateTime EffectiveAtUtc { get; set; }
    public DateTime RecordedAtUtc { get; set; }
    public DateTime? SupersededAtUtc { get; set; }
}
