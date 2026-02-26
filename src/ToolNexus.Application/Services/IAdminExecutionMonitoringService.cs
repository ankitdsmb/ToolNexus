using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminExecutionMonitoringService
{
    Task<ExecutionHealthSummary> GetHealthAsync(CancellationToken cancellationToken);
    Task<ExecutionWorkersResponse> GetWorkersAsync(CancellationToken cancellationToken);
    Task<ExecutionIncidentPage> GetIncidentsAsync(int page, int pageSize, CancellationToken cancellationToken);
    Task<IReadOnlyList<ExecutionStreamItem>> GetExecutionStreamAsync(int take, CancellationToken cancellationToken);
    Task<GovernanceVisibilitySummary> GetGovernanceVisibilityAsync(CancellationToken cancellationToken);
    Task<CapabilityLifecycleSummary> GetCapabilityLifecycleAsync(CancellationToken cancellationToken);
    Task<QualityIntelligenceSummary> GetQualityIntelligenceAsync(CancellationToken cancellationToken);
    Task<OperatorCommandCenterSnapshot> GetCommandCenterSnapshotAsync(int incidentPage, int incidentPageSize, int streamTake, CancellationToken cancellationToken);
}
