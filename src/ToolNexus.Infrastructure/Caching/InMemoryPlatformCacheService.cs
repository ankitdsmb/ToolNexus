using Microsoft.Extensions.Caching.Memory;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Caching;

public sealed class InMemoryPlatformCacheService(IMemoryCache cache) : IPlatformCacheService
{
    private readonly HashSet<string> _keys = [];
    private readonly object _sync = new();

    public Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        if (cache.TryGetValue(key, out T? cached) && cached is not null)
        {
            return Task.FromResult(cached);
        }

        return CreateAsync(key, factory, ttl, cancellationToken);
    }

    public void Remove(string key)
    {
        cache.Remove(key);
        lock (_sync)
        {
            _keys.Remove(key);
        }
    }

    public void RemoveByPrefix(string prefix)
    {
        string[] keys;
        lock (_sync)
        {
            keys = _keys.Where(x => x.StartsWith(prefix, StringComparison.Ordinal)).ToArray();
        }

        foreach (var key in keys)
        {
            Remove(key);
        }
    }

    private async Task<T> CreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken cancellationToken)
    {
        var created = await factory(cancellationToken);
        cache.Set(key, created, ttl);
        lock (_sync)
        {
            _keys.Add(key);
        }

        return created;
    }
}
