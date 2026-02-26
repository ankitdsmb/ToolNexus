namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class OperatorApprovedActionEntity
{
    public Guid Id { get; set; }
    public Guid InsightId { get; set; }
    public string OperatorId { get; set; } = string.Empty;
    public string Decision { get; set; } = string.Empty;
    public string AuthorityContext { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime TimestampUtc { get; set; }
}
