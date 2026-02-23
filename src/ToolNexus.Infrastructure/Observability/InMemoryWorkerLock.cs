namespace ToolNexus.Infrastructure.Observability;

public sealed class InMemoryWorkerLock : IDistributedWorkerLock
{
    private readonly SemaphoreSlim _gate = new(1, 1);

    public async Task<IAsyncDisposable?> TryAcquireAsync(string lockName, TimeSpan ttl, CancellationToken cancellationToken)
    {
        var acquired = await _gate.WaitAsync(0, cancellationToken);
        return acquired ? new Releaser(_gate) : null;
    }

    private sealed class Releaser(SemaphoreSlim gate) : IAsyncDisposable
    {
        public ValueTask DisposeAsync()
        {
            gate.Release();
            return ValueTask.CompletedTask;
        }
    }
}
