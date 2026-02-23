namespace ToolNexus.Application.Models;

public sealed record ChangeHistoryQuery(
    int Page,
    int PageSize,
    string? Search,
    string? ActionType,
    string? EntityType,
    string? Actor,
    string? Severity,
    DateTime? FromUtc,
    DateTime? ToUtc,
    string? CorrelationId);

public sealed record ChangeHistoryItem(
    Guid Id,
    DateTime OccurredAtUtc,
    string Actor,
    string ActionType,
    string EntityType,
    string EntityId,
    string Severity,
    string? CorrelationId,
    string? RequestId,
    bool RedactionApplied,
    bool TruncationApplied,
    int? PayloadBytesOriginal,
    int? PayloadBytesFinal,
    string SummaryPreview);

public sealed record ChangeHistoryPage(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<ChangeHistoryItem> Items,
    bool HasNextPage);

public sealed record ChangeHistoryPayloadDetail(
    Guid Id,
    string PayloadJson,
    bool RedactionApplied,
    bool TruncationApplied,
    int? PayloadBytesOriginal,
    int? PayloadBytesFinal);
