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

    public async Task<IReadOnlyList<ExecutionStreamItem>> GetExecutionStreamAsync(int take, CancellationToken cancellationToken)
    {
        var safeTake = Math.Clamp(take, 1, 100);
        var stream = await repository.GetExecutionStreamAsync(safeTake, cancellationToken);
        return stream.Select(x => new ExecutionStreamItem(
            x.ExecutionRunId,
            x.ToolId,
            x.Authority,
            x.Adapter,
            x.RuntimeIdentity,
            x.GovernanceResult,
            x.Status,
            x.DurationMs,
            x.ExecutedAtUtc)).ToList();
    }

    public async Task<GovernanceVisibilitySummary> GetGovernanceVisibilityAsync(CancellationToken cancellationToken)
    {
        var snapshot = await repository.GetGovernanceVisibilityAsync(cancellationToken);
        return new GovernanceVisibilitySummary(snapshot.ApprovedDecisions, snapshot.BlockedExecutions, snapshot.RequiresApproval, snapshot.RiskTierDistribution);
    }

    public async Task<CapabilityLifecycleSummary> GetCapabilityLifecycleAsync(CancellationToken cancellationToken)
    {
        var snapshot = await repository.GetCapabilityLifecycleAsync(cancellationToken);
        return new CapabilityLifecycleSummary(snapshot.Draft, snapshot.Review, snapshot.Approved, snapshot.Active, snapshot.Deprecated);
    }

    public async Task<QualityIntelligenceSummary> GetQualityIntelligenceAsync(CancellationToken cancellationToken)
    {
        var snapshot = await repository.GetQualityIntelligenceAsync(cancellationToken);
        return new QualityIntelligenceSummary(snapshot.AverageQualityScore, snapshot.ConformanceFailures, snapshot.RuntimeInstabilitySignals, snapshot.AnomalyAlerts);
    }

    public async Task<OperatorCommandCenterSnapshot> GetCommandCenterSnapshotAsync(int incidentPage, int incidentPageSize, int streamTake, CancellationToken cancellationToken)
    {
        var health = await GetHealthAsync(cancellationToken);
        var workers = await GetWorkersAsync(cancellationToken);
        var incidents = await GetIncidentsAsync(incidentPage, incidentPageSize, cancellationToken);
        var stream = await GetExecutionStreamAsync(streamTake, cancellationToken);
        var governance = await GetGovernanceVisibilityAsync(cancellationToken);
        var capability = await GetCapabilityLifecycleAsync(cancellationToken);
        var quality = await GetQualityIntelligenceAsync(cancellationToken);
        return new OperatorCommandCenterSnapshot(health, workers, incidents, stream, governance, capability, quality);
    }
}
