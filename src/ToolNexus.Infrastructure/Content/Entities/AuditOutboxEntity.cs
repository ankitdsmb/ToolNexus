namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AuditOutboxEntity
{
    public Guid Id { get; set; }
    public Guid AuditEventId { get; set; }
    public string Destination { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty;
    public string DeliveryState { get; set; } = "pending";
    public int AttemptCount { get; set; }
    public DateTime NextAttemptAtUtc { get; set; }
    public string? LastErrorCode { get; set; }
    public string? LastErrorMessage { get; set; }
    public DateTime? LastAttemptAtUtc { get; set; }
    public DateTime? DeliveredAtUtc { get; set; }
    public string? LeaseOwner { get; set; }
    public DateTime? LeaseExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public AuditEventEntity AuditEvent { get; set; } = null!;
    public AuditDeadLetterEntity? DeadLetter { get; set; }
}
