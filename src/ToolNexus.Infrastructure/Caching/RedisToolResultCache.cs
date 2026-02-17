using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Caching;

public sealed class RedisToolResultCache(
    IDistributedCache distributedCache,
    IMemoryCache memoryCache,
    IOptions<ToolResultCacheOptions> cacheOptions,
    ILogger<RedisToolResultCache> logger) : IToolResultCache
{
    private readonly ToolResultCacheOptions _options = cacheOptions.Value ?? new ToolResultCacheOptions();

    public async Task<ToolResultCacheItem?> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        var normalizedKey = BuildKey(key);
        if (memoryCache.TryGetValue<ToolResultCacheItem>(normalizedKey, out var localValue))
        {
            return localValue;
        }

        try
        {
            var payload = await distributedCache.GetStringAsync(normalizedKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(payload))
            {
                return null;
            }

            var cachedValue = JsonSerializer.Deserialize<ToolResultCacheItem>(payload);
            if (cachedValue is null)
            {
                return null;
            }

            memoryCache.Set(normalizedKey, cachedValue, TimeSpan.FromSeconds(_options.AbsoluteExpirationSeconds));
            return cachedValue;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis cache unavailable for key {CacheKey}. Falling back to local memory cache.", normalizedKey);
            return null;
        }
    }

    public async Task SetAsync(string key, ToolResultCacheItem value, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key) || value is null)
        {
            return;
        }

        var normalizedKey = BuildKey(key);
        memoryCache.Set(normalizedKey, value, ttl);

        try
        {
            var payload = JsonSerializer.Serialize(value);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl
            };

            await distributedCache.SetStringAsync(normalizedKey, payload, options, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed writing to Redis cache for key {CacheKey}. Request will continue using memory cache.", normalizedKey);
        }
    }

    private string BuildKey(string key)
    {
        var prefix = string.IsNullOrWhiteSpace(_options.KeyPrefix) ? "toolnexus" : _options.KeyPrefix.Trim();
        return $"{prefix}:{key}";
    }
}
