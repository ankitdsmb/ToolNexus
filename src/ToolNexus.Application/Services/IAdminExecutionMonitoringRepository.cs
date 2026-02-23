using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminExecutionMonitoringRepository
{
    Task<ExecutionHealthSummarySnapshot> GetHealthSnapshotAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ExecutionWorkerSnapshot>> GetWorkerSnapshotsAsync(DateTime utcNow, CancellationToken cancellationToken);
    Task<ExecutionIncidentSnapshotPage> GetIncidentSnapshotsAsync(int page, int pageSize, CancellationToken cancellationToken);
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
