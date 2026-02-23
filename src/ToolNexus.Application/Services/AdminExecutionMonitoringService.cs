using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AdminExecutionMonitoringService(IAdminExecutionMonitoringRepository repository) : IAdminExecutionMonitoringService
{
    public async Task<ExecutionHealthSummary> GetHealthAsync(CancellationToken cancellationToken)
    {
        var snapshot = await repository.GetHealthSnapshotAsync(cancellationToken);
        double? oldestPendingAgeMinutes = snapshot.OldestPendingCreatedAtUtc is null
            ? null
            : Math.Round((DateTime.UtcNow - snapshot.OldestPendingCreatedAtUtc.Value).TotalMinutes, 1);

        return new ExecutionHealthSummary(
            snapshot.PendingItems,
            snapshot.RetryCount,
            snapshot.DeadLetterCount,
            oldestPendingAgeMinutes,
            snapshot.RecentBacklogCount > snapshot.PreviousBacklogCount,
            snapshot.DeadLetterCount > 0);
    }

    public async Task<ExecutionWorkersResponse> GetWorkersAsync(CancellationToken cancellationToken)
    {
        var workers = await repository.GetWorkerSnapshotsAsync(DateTime.UtcNow, cancellationToken);
        return new ExecutionWorkersResponse(workers.Select(x => new ExecutionWorkerStatus(
            x.WorkerInstanceId,
            x.LastHeartbeatUtc,
            x.ActiveJobs,
            x.RecentErrors,
            x.IsStale)).ToList());
    }

    public async Task<ExecutionIncidentPage> GetIncidentsAsync(int page, int pageSize, CancellationToken cancellationToken)
    {
        var safePage = page <= 0 ? 1 : page;
        var safePageSize = Math.Clamp(pageSize, 1, 100);
        var snapshot = await repository.GetIncidentSnapshotsAsync(safePage, safePageSize, cancellationToken);
        return new ExecutionIncidentPage(snapshot.Page, snapshot.PageSize, snapshot.TotalItems,
            snapshot.Items.Select(x => new ExecutionIncident(x.EventType, x.Severity, x.Destination, x.OccurredAtUtc, x.Summary, x.AttemptCount)).ToList());
    }
}
