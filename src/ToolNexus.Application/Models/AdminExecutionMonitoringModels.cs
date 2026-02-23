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
