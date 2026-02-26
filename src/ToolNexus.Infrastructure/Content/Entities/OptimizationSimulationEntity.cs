namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class OptimizationSimulationEntity
{
    public Guid SimulationId { get; set; }
    public Guid RecommendationId { get; set; }
    public string SimulationSummary { get; set; } = string.Empty;
    public decimal ProjectedRiskDelta { get; set; }
    public decimal ProjectedBenefitDelta { get; set; }
    public bool ApprovedForReview { get; set; }
    public string SourceSnapshotIds { get; set; } = "[]";
    public string SyntheticWorkloadRef { get; set; } = string.Empty;
    public string GovernanceReplayRef { get; set; } = string.Empty;
    public DateTime SimulatedAtUtc { get; set; }
}
