using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

/// <summary>
/// No-op coordinator that simulates warm pool orchestration without creating processes or containers.
/// </summary>
public sealed class NoOpWorkerPoolCoordinator : IWorkerPoolCoordinator
{
    private static readonly TimeSpan DefaultLeaseLifetime = TimeSpan.FromMinutes(5);

    public Task<WorkerLease> AcquireLeaseAsync(WorkerType workerType, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(workerType);

        var lease = WorkerLease.Create(workerType, DefaultLeaseLifetime);
        return Task.FromResult(lease);
    }

    public Task ReleaseLeaseAsync(WorkerLease lease, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(lease);
        return Task.CompletedTask;
    }
}
