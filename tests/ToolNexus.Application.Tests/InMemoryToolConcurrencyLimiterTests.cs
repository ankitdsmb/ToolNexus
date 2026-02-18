using System.Threading;
using System.Threading.Tasks;
using ToolNexus.Application.Services.Pipeline;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class InMemoryToolConcurrencyLimiterTests
{
    [Fact]
    public async Task AcquireAsync_LimitsConcurrencyPerSlug()
    {
        var limiter = new InMemoryToolConcurrencyLimiter();
        const string slug = "test-slug";
        const int maxConcurrency = 1;

        // Acquire the semaphore
        var release = await limiter.AcquireAsync(slug, maxConcurrency, CancellationToken.None);

        // Attempt to acquire again (should block)
        var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
        {
            await limiter.AcquireAsync(slug, maxConcurrency, cts.Token);
        });

        // Release the semaphore
        release.Dispose();

        // Attempt to acquire again (should succeed now)
        var release2 = await limiter.AcquireAsync(slug, maxConcurrency, CancellationToken.None);
        release2.Dispose();
    }

    [Fact]
    public async Task AcquireAsync_DifferentSlugsAreIndependent()
    {
        var limiter = new InMemoryToolConcurrencyLimiter();
        const int maxConcurrency = 1;

        // Acquire for slug1
        var release1 = await limiter.AcquireAsync("slug1", maxConcurrency, CancellationToken.None);

        // Acquire for slug2 (should succeed immediately)
        var release2 = await limiter.AcquireAsync("slug2", maxConcurrency, CancellationToken.None);

        release1.Dispose();
        release2.Dispose();
    }

    [Fact]
    public async Task AcquireAsync_RespectsCancellationToken()
    {
        var limiter = new InMemoryToolConcurrencyLimiter();
        const string slug = "test-slug";
        const int maxConcurrency = 1;

        var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
        {
            await limiter.AcquireAsync(slug, maxConcurrency, cts.Token);
        });
    }

    [Fact]
    public async Task Dispose_ReleasesSemaphore()
    {
        var limiter = new InMemoryToolConcurrencyLimiter();
        const string slug = "test-slug";
        const int maxConcurrency = 1;

        var release = await limiter.AcquireAsync(slug, maxConcurrency, CancellationToken.None);
        release.Dispose();

        // Should be able to acquire again immediately
        var release2 = await limiter.AcquireAsync(slug, maxConcurrency, CancellationToken.None);
        release2.Dispose();
    }
}
