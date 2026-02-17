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
    private const int FailureThreshold = 3;
    private static readonly TimeSpan CircuitOpenDuration = TimeSpan.FromSeconds(30);

    private readonly ToolResultCacheOptions _options = cacheOptions.Value ?? new ToolResultCacheOptions();
    private readonly object _stateLock = new();

    private int _consecutiveFailures;
    private DateTimeOffset? _circuitOpenUntil;

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

        if (IsCircuitOpen())
        {
            logger.LogDebug("Redis circuit breaker is open. Skipping distributed cache read for key {CacheKey}.", normalizedKey);
            return null;
        }

        try
        {
            var payload = await distributedCache.GetStringAsync(normalizedKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(payload))
            {
                RegisterSuccess();
                return null;
            }

            var cachedValue = JsonSerializer.Deserialize<ToolResultCacheItem>(payload);
            if (cachedValue is null)
            {
                RegisterSuccess();
                return null;
            }

            memoryCache.Set(normalizedKey, cachedValue, TimeSpan.FromSeconds(_options.AbsoluteExpirationSeconds));
            RegisterSuccess();
            return cachedValue;
        }
        catch (Exception ex)
        {
            RegisterFailure(ex, normalizedKey, "read");
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

        if (IsCircuitOpen())
        {
            logger.LogDebug("Redis circuit breaker is open. Skipping distributed cache write for key {CacheKey}.", normalizedKey);
            return;
        }

        try
        {
            var payload = JsonSerializer.Serialize(value);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl
            };

            await distributedCache.SetStringAsync(normalizedKey, payload, options, cancellationToken);
            RegisterSuccess();
        }
        catch (Exception ex)
        {
            RegisterFailure(ex, normalizedKey, "write");
        }
    }

    private bool IsCircuitOpen()
    {
        lock (_stateLock)
        {
            if (_circuitOpenUntil is null)
            {
                return false;
            }

            if (_circuitOpenUntil > DateTimeOffset.UtcNow)
            {
                return true;
            }

            _circuitOpenUntil = null;
            _consecutiveFailures = 0;
            return false;
        }
    }

    private void RegisterSuccess()
    {
        lock (_stateLock)
        {
            _consecutiveFailures = 0;
            _circuitOpenUntil = null;
        }
    }

    private void RegisterFailure(Exception ex, string normalizedKey, string operation)
    {
        var openCircuit = false;

        lock (_stateLock)
        {
            _consecutiveFailures++;
            if (_consecutiveFailures >= FailureThreshold)
            {
                _circuitOpenUntil = DateTimeOffset.UtcNow.Add(CircuitOpenDuration);
                openCircuit = true;
            }
        }

        if (openCircuit)
        {
            logger.LogWarning(ex, "Redis cache {Operation} failed for key {CacheKey}. Circuit opened for {DurationSeconds} seconds.", operation, normalizedKey, CircuitOpenDuration.TotalSeconds);
        }
        else
        {
            logger.LogWarning(ex, "Redis cache {Operation} failed for key {CacheKey}. Falling back to local memory cache.", operation, normalizedKey);
        }
    }

    private string BuildKey(string key)
    {
        var prefix = string.IsNullOrWhiteSpace(_options.KeyPrefix) ? "toolnexus" : _options.KeyPrefix.Trim();
        return $"{prefix}:{key}";
    }
}
