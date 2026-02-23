using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminExecutionMonitoringService
{
    Task<ExecutionHealthSummary> GetHealthAsync(CancellationToken cancellationToken);
    Task<ExecutionWorkersResponse> GetWorkersAsync(CancellationToken cancellationToken);
    Task<ExecutionIncidentPage> GetIncidentsAsync(int page, int pageSize, CancellationToken cancellationToken);
}
