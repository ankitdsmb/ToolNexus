namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class PlatformSignalEntity
{
    public Guid Id { get; set; }
    public string SignalType { get; set; } = string.Empty;
    public string SourceDomain { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public DateTime DetectedAtUtc { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public string RecommendedActionType { get; set; } = string.Empty;
    public string TenantId { get; set; } = "global";
    public string AuthorityContext { get; set; } = "operator";
    public string PayloadJson { get; set; } = "{}";
}
