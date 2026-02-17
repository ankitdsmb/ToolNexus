using System.Collections.Concurrent;
using System.Threading;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class InMemoryToolConcurrencyLimiter : IToolConcurrencyLimiter
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _semaphores = new(StringComparer.OrdinalIgnoreCase);

    public async ValueTask<IDisposable> AcquireAsync(string slug, int maxConcurrency, CancellationToken cancellationToken)
    {
        var semaphore = _semaphores.GetOrAdd(slug, _ => new SemaphoreSlim(maxConcurrency, maxConcurrency));
        await semaphore.WaitAsync(cancellationToken);
        return new Releaser(semaphore);
    }

    private sealed class Releaser(SemaphoreSlim semaphore) : IDisposable
    {
        public void Dispose() => semaphore.Release();
    }
}
