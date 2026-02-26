namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class OptimizationOutcomeEntity
{
    public Guid OutcomeId { get; set; }
    public Guid RecommendationId { get; set; }
    public string OutcomeStatus { get; set; } = string.Empty;
    public decimal BenefitRealized { get; set; }
    public decimal RiskRealized { get; set; }
    public string MeasuredBy { get; set; } = string.Empty;
    public DateTime MeasuredAtUtc { get; set; }
}
