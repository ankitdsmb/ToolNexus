namespace ToolNexus.Infrastructure.Observability;

public interface IDistributedWorkerLock
{
    Task<IAsyncDisposable?> TryAcquireAsync(string lockName, TimeSpan ttl, CancellationToken cancellationToken);
}
