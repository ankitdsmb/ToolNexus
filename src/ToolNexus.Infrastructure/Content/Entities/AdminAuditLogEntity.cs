namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class AdminAuditLogEntity
{
    public long Id { get; set; }
    public string UserId { get; set; } = "system";
    public string ActionType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public DateTime TimestampUtc { get; set; }
}

