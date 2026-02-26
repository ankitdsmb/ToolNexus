namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AiGenerationSignalEntity
{
    public Guid SignalId { get; set; } = Guid.NewGuid();
    public string Source { get; set; } = string.Empty;
    public int Frequency { get; set; }
    public decimal ImpactEstimate { get; set; }
    public string SuggestedToolCategory { get; set; } = string.Empty;
    public decimal ConfidenceScore { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public string TenantId { get; set; } = "default";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
