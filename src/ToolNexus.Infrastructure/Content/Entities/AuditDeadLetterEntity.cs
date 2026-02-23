namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AuditDeadLetterEntity
{
    public Guid Id { get; set; }
    public Guid OutboxId { get; set; }
    public Guid AuditEventId { get; set; }
    public string Destination { get; set; } = string.Empty;
    public int FinalAttemptCount { get; set; }
    public DateTime FirstFailedAtUtc { get; set; }
    public DateTime DeadLetteredAtUtc { get; set; }
    public string ErrorSummary { get; set; } = string.Empty;
    public string? ErrorDetails { get; set; }
    public string OperatorStatus { get; set; } = "open";
    public string? OperatorNote { get; set; }
    public string? OperatorId { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public AuditOutboxEntity Outbox { get; set; } = null!;
    public AuditEventEntity AuditEvent { get; set; } = null!;
}
