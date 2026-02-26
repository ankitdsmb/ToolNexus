namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class OperatorCommandEntity
{
    public Guid Id { get; set; }
    public string Command { get; set; } = string.Empty;
    public string ExecutedBy { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime TimestampUtc { get; set; }
    public string Result { get; set; } = string.Empty;
    public string? RollbackInfo { get; set; }
    public string ImpactScope { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string AuthorityContext { get; set; } = string.Empty;
}
