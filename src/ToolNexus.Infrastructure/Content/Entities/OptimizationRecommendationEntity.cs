namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class OptimizationRecommendationEntity
{
    public Guid RecommendationId { get; set; }
    public string Domain { get; set; } = string.Empty;
    public string TargetNodeId { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public decimal ConfidenceScore { get; set; }
    public string SuggestedChange { get; set; } = string.Empty;
    public string RiskImpact { get; set; } = string.Empty;
    public string ExpectedBenefit { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = "global";
    public string RollbackMetadata { get; set; } = "{}";
    public DateTime GeneratedAtUtc { get; set; }
    public string Status { get; set; } = "pending";
}
