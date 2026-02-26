namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AdminOperationLedgerEntity
{
    public Guid Id { get; set; }
    public string OperationDomain { get; set; } = string.Empty;
    public string OperationName { get; set; } = string.Empty;
    public string RequestedBy { get; set; } = "system";
    public string ResultStatus { get; set; } = "success";
    public string? CorrelationId { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public DateTime ExecutedAtUtc { get; set; }
}
