namespace ToolNexus.Application.Models;

public sealed record ExecutionLedgerQuery(
    int Page,
    int PageSize,
    string? CorrelationId,
    string? TenantId,
    string? ToolId);

public sealed record ExecutionLedgerSummary(
    Guid Id,
    string ToolId,
    DateTime ExecutedAtUtc,
    bool Success,
    string Authority,
    string? CorrelationId,
    string? TenantId,
    string? TraceId,
    string ConformanceStatus,
    bool ConformanceValid,
    bool ConformanceNormalized,
    int ConformanceIssueCount);

public sealed record ExecutionLedgerPage(
    int Page,
    int PageSize,
    int TotalItems,
    IReadOnlyList<ExecutionLedgerSummary> Items);

public sealed record ExecutionLedgerSnapshot(
    string SnapshotId,
    string Authority,
    string RuntimeLanguage,
    string ExecutionCapability,
    string? CorrelationId,
    string? TenantId,
    DateTime TimestampUtc,
    string ConformanceVersion,
    string? PolicySnapshotJson,
    Guid GovernanceDecisionId);

public sealed record ExecutionLedgerDetail(
    Guid Id,
    string ToolId,
    DateTime ExecutedAtUtc,
    bool Success,
    long DurationMs,
    string? ErrorType,
    int PayloadSize,
    string ExecutionMode,
    string RuntimeLanguage,
    string AdapterName,
    string AdapterResolutionStatus,
    string Capability,
    string Authority,
    bool ShadowExecution,
    string? CorrelationId,
    string? TenantId,
    string? TraceId,
    ExecutionLedgerSnapshot Snapshot,
    ExecutionLedgerConformance Conformance,
    ExecutionLedgerAuthorityDecision AuthorityDecision);

public sealed record ExecutionLedgerConformance(
    bool IsValid,
    string NormalizedStatus,
    bool WasNormalized,
    int IssueCount,
    string IssuesJson);

public sealed record ExecutionLedgerAuthorityDecision(
    string Authority,
    bool AdmissionAllowed,
    string AdmissionReason,
    string DecisionSource);

