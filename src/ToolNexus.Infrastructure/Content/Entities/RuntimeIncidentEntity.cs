namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class RuntimeIncidentEntity
{
    public long Id { get; set; }
    public string Fingerprint { get; set; } = string.Empty;
    public string ToolSlug { get; set; } = string.Empty;
    public string Phase { get; set; } = string.Empty;
    public string ErrorType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Stack { get; set; }
    public string? CorrelationId { get; set; }
    public string PayloadType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public int Count { get; set; }
    public DateTimeOffset FirstOccurredUtc { get; set; }
    public DateTimeOffset LastOccurredUtc { get; set; }
}
