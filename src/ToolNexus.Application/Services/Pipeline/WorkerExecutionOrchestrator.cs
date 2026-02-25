using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class WorkerExecutionOrchestrator(IWorkerPoolCoordinator workerPoolCoordinator, IWorkerRuntimeManager workerRuntimeManager)
{
    public async Task<WorkerOrchestrationResult> PrepareExecutionAsync(
        WorkerExecutionEnvelope envelope,
        WorkerType workerType,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(envelope);
        ArgumentNullException.ThrowIfNull(workerType);

        WorkerLease? lease = null;
        var leaseAcquired = false;

        try
        {
            lease = await workerPoolCoordinator.AcquireLeaseAsync(workerType, cancellationToken);
            leaseAcquired = true;
            lease = lease.WithState(WorkerLeaseState.Busy);

            var preparation = await workerRuntimeManager.PrepareExecutionAsync(envelope, cancellationToken);

            return new WorkerOrchestrationResult(preparation, leaseAcquired, lease.State);
        }
        finally
        {
            if (leaseAcquired && lease is not null)
            {
                await workerPoolCoordinator.ReleaseLeaseAsync(lease.WithState(WorkerLeaseState.Released), cancellationToken);
            }
        }
    }
}
