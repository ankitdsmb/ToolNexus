namespace ToolNexus.Application.Models;

public sealed class ToolExecutionEvent
{
    public Guid ExecutionRunId { get; init; } = Guid.NewGuid();
    public string ToolSlug { get; init; } = string.Empty;
    public DateTime TimestampUtc { get; init; }
    public long DurationMs { get; init; }
    public bool Success { get; init; }
    public string? ErrorType { get; init; }
    public int PayloadSize { get; init; }
    public string ExecutionMode { get; init; } = string.Empty;
    public string Language { get; init; } = string.Empty;
    public string AdapterName { get; init; } = string.Empty;
    public string AdapterResolutionStatus { get; init; } = string.Empty;
    public string Capability { get; init; } = string.Empty;
    public string WorkerManagerUsed { get; init; } = string.Empty;
    public string LeaseAcquired { get; init; } = string.Empty;
    public string WorkerLeaseState { get; init; } = string.Empty;
    public string OrchestratorUsed { get; init; } = string.Empty;
    public string ExecutionAuthority { get; init; } = string.Empty;
    public string ShadowExecution { get; init; } = string.Empty;
    public string ConformanceValid { get; init; } = string.Empty;
    public string ConformanceNormalized { get; init; } = string.Empty;
    public int ConformanceIssueCount { get; init; }
    public string ExecutionSnapshotId { get; init; } = string.Empty;
    public string SnapshotAuthority { get; init; } = string.Empty;
    public string SnapshotLanguage { get; init; } = string.Empty;
    public string SnapshotCapability { get; init; } = string.Empty;
    public string AdmissionAllowed { get; init; } = string.Empty;
    public string AdmissionReason { get; init; } = string.Empty;
    public string AdmissionDecisionSource { get; init; } = string.Empty;
    public string? CorrelationId { get; init; }
    public string? TenantId { get; init; }
    public string? TraceId { get; init; }
    public DateTime SnapshotTimestampUtc { get; init; }
    public string SnapshotConformanceVersion { get; init; } = string.Empty;
    public string? SnapshotPolicyJson { get; init; }
    public Guid GovernanceDecisionId { get; init; }
    public string GovernancePolicyVersion { get; init; } = string.Empty;
    public string GovernanceDecisionStatus { get; init; } = string.Empty;
    public string GovernanceDecisionReason { get; init; } = string.Empty;
    public string GovernanceApprovedBy { get; init; } = string.Empty;
    public string ConformanceNormalizedStatus { get; init; } = string.Empty;
    public string ConformanceIssuesJson { get; init; } = "[]";
    public string RuntimeLanguage => Language;
    public string ToolId => ToolSlug;

}
