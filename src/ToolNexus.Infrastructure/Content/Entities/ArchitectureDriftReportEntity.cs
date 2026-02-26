namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ArchitectureDriftReportEntity
{
    public Guid DriftReportId { get; set; }
    public string DriftType { get; set; } = string.Empty;
    public string AffectedDomain { get; set; } = string.Empty;
    public decimal DriftScore { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string IndicatorsJson { get; set; } = "{}";
    public DateTime DetectedAtUtc { get; set; }
}
