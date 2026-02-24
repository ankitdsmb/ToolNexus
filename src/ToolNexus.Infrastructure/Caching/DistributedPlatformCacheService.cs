using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Caching;

public sealed class DistributedPlatformCacheService : IPlatformCacheService, IDisposable
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly IBackgroundEventBus _eventBus;
    private readonly ILogger<DistributedPlatformCacheService> _logger;
    private readonly IDisposable _subscription;
    private readonly HashSet<string> _keys = [];
    private readonly object _sync = new();

    public DistributedPlatformCacheService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        IBackgroundEventBus eventBus,
        ILogger<DistributedPlatformCacheService> logger)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _eventBus = eventBus;
        _logger = logger;
        _subscription = _eventBus.Subscribe<PlatformCacheInvalidationEvent>(OnInvalidationAsync);
    }

    public async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        if (_memoryCache.TryGetValue<T>(key, out var cached) && cached is not null)
        {
            return cached;
        }

        try
        {
            var payload = await _distributedCache.GetStringAsync(key, cancellationToken);
            if (!string.IsNullOrWhiteSpace(payload))
            {
                var deserialized = JsonSerializer.Deserialize<T>(payload);
                if (deserialized is not null)
                {
                    CacheLocally(key, deserialized, ttl);
                    return deserialized;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Distributed cache read failed for key {CacheKey}. Falling back to local cache.", key);
        }

        var created = await factory(cancellationToken);
        CacheLocally(key, created, ttl);

        try
        {
            await _distributedCache.SetStringAsync(
                key,
                JsonSerializer.Serialize(created),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Distributed cache write failed for key {CacheKey}. Local cache remains active.", key);
        }

        return created;
    }

    public void Remove(string key)
    {
        RemoveLocal(key);
        _ = RemoveDistributedAsync(key, CancellationToken.None);
        _ = _eventBus.PublishAsync(new PlatformCacheInvalidationEvent(key, false));
    }

    public void RemoveByPrefix(string prefix)
    {
        RemoveLocalByPrefix(prefix);
        _ = _eventBus.PublishAsync(new PlatformCacheInvalidationEvent(prefix, true));
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        RemoveLocal(key);
        await RemoveDistributedAsync(key, cancellationToken);
        await _eventBus.PublishAsync(new PlatformCacheInvalidationEvent(key, false), cancellationToken);
    }

    public async Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        RemoveLocalByPrefix(prefix);
        await _eventBus.PublishAsync(new PlatformCacheInvalidationEvent(prefix, true), cancellationToken);
    }

    private async Task OnInvalidationAsync(PlatformCacheInvalidationEvent cacheInvalidation, CancellationToken cancellationToken)
    {
        if (cacheInvalidation.IsPrefix)
        {
            RemoveLocalByPrefix(cacheInvalidation.Key);
            return;
        }

        RemoveLocal(cacheInvalidation.Key);
        await RemoveDistributedAsync(cacheInvalidation.Key, cancellationToken);
    }

    private void CacheLocally<T>(string key, T value, TimeSpan ttl)
    {
        var entryOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl
        };
        entryOptions.SetSize(1);
        _memoryCache.Set(key, value, entryOptions);
        lock (_sync)
        {
            _keys.Add(key);
        }
    }

    private void RemoveLocal(string key)
    {
        _memoryCache.Remove(key);
        lock (_sync)
        {
            _keys.Remove(key);
        }
    }

    private void RemoveLocalByPrefix(string prefix)
    {
        string[] keys;
        lock (_sync)
        {
            keys = _keys.Where(x => x.StartsWith(prefix, StringComparison.Ordinal)).ToArray();
        }

        foreach (var key in keys)
        {
            RemoveLocal(key);
        }
    }

    private async Task RemoveDistributedAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            await _distributedCache.RemoveAsync(key, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Distributed cache removal failed for key {CacheKey}.", key);
        }
    }

    public void Dispose() => _subscription.Dispose();
}
