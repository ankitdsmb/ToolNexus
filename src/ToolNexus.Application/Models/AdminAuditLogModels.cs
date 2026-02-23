namespace ToolNexus.Application.Models;

public sealed record AdminAuditLogEntry(
    long Id,
    string UserId,
    string ActionType,
    string EntityType,
    string EntityId,
    string? BeforeJson,
    string? AfterJson,
    DateTime TimestampUtc);

