namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ArchitectureEvolutionSignalEntity
{
    public Guid SignalId { get; set; }
    public string SignalType { get; set; } = string.Empty;
    public string SourceDomain { get; set; } = string.Empty;
    public decimal SeverityScore { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string RuntimeIdentity { get; set; } = string.Empty;
    public DateTime DetectedAtUtc { get; set; }
    public string PayloadJson { get; set; } = "{}";
}
