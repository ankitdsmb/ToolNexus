namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ArchitectDecisionEntity
{
    public Guid DecisionId { get; set; }
    public Guid RecommendationId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string ArchitectId { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public DateTime DecisionedAtUtc { get; set; }
}
