namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class EvolutionRecommendationEntity
{
    public Guid RecommendationId { get; set; }
    public string AffectedDomain { get; set; } = string.Empty;
    public string ArchitectureImpactLevel { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = string.Empty;
    public decimal ConfidenceScore { get; set; }
    public decimal EstimatedMigrationCost { get; set; }
    public decimal ExpectedPlatformBenefit { get; set; }
    public string BackwardCompatibilityImpact { get; set; } = string.Empty;
    public string SuggestedPhases { get; set; } = string.Empty;
    public string RollbackStrategy { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; }
    public string Status { get; set; } = string.Empty;
}
