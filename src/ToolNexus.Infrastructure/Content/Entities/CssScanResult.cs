namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class CssScanResult
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public int TotalCssBytes { get; set; }
    public int UsedCssBytes { get; set; }
    public int UnusedCssBytes { get; set; }
    public double OptimizationPotential { get; set; }
    public string Framework { get; set; } = "Unknown";
    public string? FrameworkDetectionJson { get; set; }
    public string? OptimizedCss { get; set; }
    public string? ResultPayloadJson { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }

    public CssScanJob? Job { get; set; }
    public List<CssSelectorMetric> SelectorMetrics { get; set; } = [];
    public List<CssArtifact> Artifacts { get; set; } = [];
}
