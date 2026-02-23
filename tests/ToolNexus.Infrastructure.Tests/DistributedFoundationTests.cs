using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Infrastructure.Caching;
using ToolNexus.Infrastructure.Observability;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class DistributedFoundationTests
{
    [Fact]
    public async Task PlatformCache_WorksWithoutRedis_UsingDistributedMemoryFallback()
    {
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var distributedCache = new MemoryDistributedCache(Microsoft.Extensions.Options.Options.Create(new MemoryDistributedCacheOptions()));
        var bus = new InMemoryBackgroundEventBus();
        var cache = new DistributedPlatformCacheService(memoryCache, distributedCache, bus, NullLogger<DistributedPlatformCacheService>.Instance);

        var factoryCalls = 0;
        var first = await cache.GetOrCreateAsync("platform:test:key", _ => Task.FromResult(++factoryCalls), TimeSpan.FromMinutes(1));
        var second = await cache.GetOrCreateAsync("platform:test:key", _ => Task.FromResult(++factoryCalls), TimeSpan.FromMinutes(1));

        Assert.Equal(1, first);
        Assert.Equal(1, second);
        Assert.Equal(1, factoryCalls);
    }

    [Fact]
    public async Task PlatformCache_WorksWithSharedDistributedCacheBackend()
    {
        var distributed = new SharedDistributedCache();
        var bus = new InMemoryBackgroundEventBus();

        using var cacheA = new DistributedPlatformCacheService(new MemoryCache(new MemoryCacheOptions()), distributed, bus, NullLogger<DistributedPlatformCacheService>.Instance);
        using var cacheB = new DistributedPlatformCacheService(new MemoryCache(new MemoryCacheOptions()), distributed, bus, NullLogger<DistributedPlatformCacheService>.Instance);

        var factoryCalls = 0;
        var first = await cacheA.GetOrCreateAsync("platform:test:shared", _ => Task.FromResult(++factoryCalls), TimeSpan.FromMinutes(1));
        var second = await cacheB.GetOrCreateAsync("platform:test:shared", _ => Task.FromResult(++factoryCalls), TimeSpan.FromMinutes(1));

        Assert.Equal(1, first);
        Assert.Equal(1, second);
        Assert.Equal(1, factoryCalls);
    }

    [Fact]
    public async Task WorkerLeadership_OnlyOneWorkerAcquiresLock()
    {
        var workerLock = new InMemoryWorkerLock();
        var leaderA = await workerLock.TryAcquireAsync("leader", TimeSpan.FromMinutes(1), CancellationToken.None);
        var leaderB = await workerLock.TryAcquireAsync("leader", TimeSpan.FromMinutes(1), CancellationToken.None);

        Assert.NotNull(leaderA);
        Assert.Null(leaderB);

        if (leaderA is not null)
        {
            await leaderA.DisposeAsync();
        }
    }

    [Fact]
    public async Task CacheInvalidation_PropagatesAcrossInstances()
    {
        var distributed = new SharedDistributedCache();
        var bus = new InMemoryBackgroundEventBus();

        using var cacheA = new DistributedPlatformCacheService(new MemoryCache(new MemoryCacheOptions()), distributed, bus, NullLogger<DistributedPlatformCacheService>.Instance);
        using var cacheB = new DistributedPlatformCacheService(new MemoryCache(new MemoryCacheOptions()), distributed, bus, NullLogger<DistributedPlatformCacheService>.Instance);

        var callsA = 0;
        var callsB = 0;

        await cacheA.GetOrCreateAsync("platform:test:invalidate", _ => Task.FromResult(++callsA), TimeSpan.FromMinutes(1));
        await cacheB.GetOrCreateAsync("platform:test:invalidate", _ => Task.FromResult(++callsB), TimeSpan.FromMinutes(1));

        await cacheA.RemoveAsync("platform:test:invalidate");
        await Task.Delay(50);

        var refreshed = await cacheB.GetOrCreateAsync("platform:test:invalidate", _ => Task.FromResult(++callsB), TimeSpan.FromMinutes(1));

        Assert.Equal(1, refreshed);
        Assert.Equal(1, callsB);
    }

    private sealed class SharedDistributedCache : IDistributedCache
    {
        private readonly Dictionary<string, byte[]> _values = new(StringComparer.Ordinal);

        public byte[]? Get(string key) => _values.TryGetValue(key, out var value) ? value : null;

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default)
            => Task.FromResult(Get(key));

        public void Refresh(string key)
        {
        }

        public Task RefreshAsync(string key, CancellationToken token = default)
            => Task.CompletedTask;

        public void Remove(string key) => _values.Remove(key);

        public Task RemoveAsync(string key, CancellationToken token = default)
        {
            Remove(key);
            return Task.CompletedTask;
        }

        public void Set(string key, byte[] value, DistributedCacheEntryOptions options)
            => _values[key] = value;

        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            Set(key, value, options);
            return Task.CompletedTask;
        }
    }
}
