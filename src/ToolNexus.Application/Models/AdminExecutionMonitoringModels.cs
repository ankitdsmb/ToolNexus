namespace ToolNexus.Application.Models;

public sealed record ExecutionHealthSummary(
    long PendingItems,
    long RetryCount,
    long DeadLetterCount,
    double? OldestPendingAgeMinutes,
    bool BacklogIncreasing,
    bool HasDeadLetters);

public sealed record ExecutionWorkerStatus(
    string WorkerInstanceId,
    DateTime? LastHeartbeatUtc,
    int ActiveJobs,
    int RecentErrors,
    bool IsStale);

public sealed record ExecutionWorkersResponse(IReadOnlyList<ExecutionWorkerStatus> Workers);

public sealed record ExecutionIncident(
    string EventType,
    string Severity,
    string Destination,
    DateTime OccurredAtUtc,
    string Summary,
    int AttemptCount);

public sealed record ExecutionIncidentPage(
    int Page,
    int PageSize,
    int TotalItems,
    IReadOnlyList<ExecutionIncident> Items);

public sealed record ExecutionStreamItem(
    Guid ExecutionRunId,
    string ToolId,
    string Authority,
    string Adapter,
    string RuntimeIdentity,
    string GovernanceResult,
    string Status,
    long DurationMs,
    DateTime ExecutedAtUtc);

public sealed record GovernanceVisibilitySummary(
    int ApprovedDecisions,
    int BlockedExecutions,
    int RequiresApproval,
    IReadOnlyDictionary<string, int> RiskTierDistribution);

public sealed record CapabilityLifecycleSummary(
    int Draft,
    int Review,
    int Approved,
    int Active,
    int Deprecated);

public sealed record QualityIntelligenceSummary(
    decimal AverageQualityScore,
    int ConformanceFailures,
    int RuntimeInstabilitySignals,
    int AnomalyAlerts);

public sealed record OperatorCommandCenterSnapshot(
    ExecutionHealthSummary Health,
    ExecutionWorkersResponse Workers,
    ExecutionIncidentPage Incidents,
    IReadOnlyList<ExecutionStreamItem> Stream,
    GovernanceVisibilitySummary Governance,
    CapabilityLifecycleSummary CapabilityLifecycle,
    QualityIntelligenceSummary Quality);

public sealed record OperatorCommandRequest(
    string Reason,
    string ImpactScope,
    string AuthorityContext,
    string? TargetExecutionId,
    string? RollbackPlan);
