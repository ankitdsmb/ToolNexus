namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class PlatformInsightEntity
{
    public Guid Id { get; set; }
    public string RelatedSignalIds { get; set; } = "[]";
    public string RecommendedAction { get; set; } = string.Empty;
    public string ImpactScope { get; set; } = string.Empty;
    public decimal RiskScore { get; set; }
    public decimal ConfidenceScore { get; set; }
    public string Status { get; set; } = "pending";
    public string CorrelationId { get; set; } = string.Empty;
    public string AuthorityContext { get; set; } = "operator";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? DecisionedAtUtc { get; set; }
    public string? DecisionedBy { get; set; }
}
