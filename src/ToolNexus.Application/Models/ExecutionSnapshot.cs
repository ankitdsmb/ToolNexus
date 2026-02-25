using ToolNexus.Application.Services.Pipeline;

namespace ToolNexus.Application.Models;

public sealed record ExecutionSnapshot(
    string SnapshotId,
    ExecutionAuthority Authority,
    ToolRuntimeLanguage RuntimeLanguage,
    ToolExecutionCapability ExecutionCapability,
    string? CorrelationId,
    string? TenantId,
    DateTime TimestampUtc,
    string ConformanceVersion,
    object? PolicySnapshot,
    Guid GovernanceDecisionId,
    string GovernancePolicyVersion,
    GovernanceDecisionStatus GovernanceStatus,
    string GovernanceDecisionReason,
    string GovernanceApprovedBy);
