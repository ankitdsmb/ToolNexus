namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class EvolutionSimulationReportEntity
{
    public Guid SimulationReportId { get; set; }
    public Guid RecommendationId { get; set; }
    public decimal ExecutionFlowImpact { get; set; }
    public decimal GovernanceFlowImpact { get; set; }
    public decimal DataModelImpact { get; set; }
    public decimal MigrationComplexity { get; set; }
    public string Summary { get; set; } = string.Empty;
    public DateTime SimulatedAtUtc { get; set; }
}
