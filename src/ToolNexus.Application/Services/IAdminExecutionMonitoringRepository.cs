using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminExecutionMonitoringRepository
{
    Task<ExecutionHealthSummarySnapshot> GetHealthSnapshotAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ExecutionWorkerSnapshot>> GetWorkerSnapshotsAsync(DateTime utcNow, CancellationToken cancellationToken);
    Task<ExecutionIncidentSnapshotPage> GetIncidentSnapshotsAsync(int page, int pageSize, CancellationToken cancellationToken);
    Task<IReadOnlyList<ExecutionStreamSnapshot>> GetExecutionStreamAsync(int take, CancellationToken cancellationToken);
    Task<GovernanceVisibilitySnapshot> GetGovernanceVisibilityAsync(CancellationToken cancellationToken);
    Task<CapabilityLifecycleSnapshot> GetCapabilityLifecycleAsync(CancellationToken cancellationToken);
    Task<QualityIntelligenceSnapshot> GetQualityIntelligenceAsync(CancellationToken cancellationToken);
}

public sealed record ExecutionHealthSummarySnapshot(
    long PendingItems,
    long RetryCount,
    long DeadLetterCount,
    DateTime? OldestPendingCreatedAtUtc,
    long RecentBacklogCount,
    long PreviousBacklogCount);

public sealed record ExecutionWorkerSnapshot(
    string WorkerInstanceId,
    DateTime? LastHeartbeatUtc,
    int ActiveJobs,
    int RecentErrors,
    bool IsStale);

public sealed record ExecutionIncidentSnapshot(
    string EventType,
    string Severity,
    string Destination,
    DateTime OccurredAtUtc,
    string Summary,
    int AttemptCount);

public sealed record ExecutionIncidentSnapshotPage(int Page, int PageSize, int TotalItems, IReadOnlyList<ExecutionIncidentSnapshot> Items);

public sealed record ExecutionStreamSnapshot(
    Guid ExecutionRunId,
    string ToolId,
    string Authority,
    string Adapter,
    string RuntimeIdentity,
    string GovernanceResult,
    string Status,
    long DurationMs,
    DateTime ExecutedAtUtc);

public sealed record GovernanceVisibilitySnapshot(
    int ApprovedDecisions,
    int BlockedExecutions,
    int RequiresApproval,
    IReadOnlyDictionary<string, int> RiskTierDistribution);

public sealed record CapabilityLifecycleSnapshot(int Draft, int Review, int Approved, int Active, int Deprecated);

public sealed record QualityIntelligenceSnapshot(decimal AverageQualityScore, int ConformanceFailures, int RuntimeInstabilitySignals, int AnomalyAlerts);
