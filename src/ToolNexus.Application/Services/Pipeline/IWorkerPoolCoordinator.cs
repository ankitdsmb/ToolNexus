using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IWorkerPoolCoordinator
{
    Task<WorkerLease> AcquireLeaseAsync(WorkerType workerType, CancellationToken cancellationToken);
    Task ReleaseLeaseAsync(WorkerLease lease, CancellationToken cancellationToken);
}
