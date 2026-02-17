using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Caching;

public sealed class RedisToolResultCache(
    IDistributedCache distributedCache,
    IMemoryCache memoryCache,
    IOptions<ToolResultCacheOptions> cacheOptions,
    ILogger<RedisToolResultCache> logger)
    : IToolResultCache
{
    private const int FailureThreshold = 3;
    private static readonly TimeSpan CircuitOpenDuration = TimeSpan.FromSeconds(30);

    private readonly ToolResultCacheOptions _options = cacheOptions.Value ?? new();
    private readonly object _stateLock = new();

    private int _consecutiveFailures;
    private DateTimeOffset? _circuitOpenUntil;

    public async Task<ToolResultCacheItem?> GetAsync(
        string key,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var normalizedKey = BuildKey(key);

        // 1️⃣ Memory cache
        if (memoryCache.TryGetValue<ToolResultCacheItem>(normalizedKey, out var localValue))
        {
            return localValue;
        }

        if (IsCircuitOpen())
        {
            logger.LogDebug("Redis circuit open. Skipping read for {CacheKey}", normalizedKey);
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

            var cached = JsonSerializer.Deserialize<ToolResultCacheItem>(payload);
            if (cached is null)
            {
                RegisterSuccess();
                return null;
            }

            memoryCache.Set(normalizedKey, cached,
                TimeSpan.FromSeconds(_options.AbsoluteExpirationSeconds));

            RegisterSuccess();
            return cached;
        }
        catch (Exception ex)
        {
            RegisterFailure(ex, normalizedKey, "read");
            return null;
        }
    }

    public async Task SetAsync(
        string key,
        ToolResultCacheItem item,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
            return;

        var normalizedKey = BuildKey(key);

        memoryCache.Set(normalizedKey, item, ttl);

        if (IsCircuitOpen())
        {
            logger.LogDebug("Redis circuit open. Skipping write for {CacheKey}", normalizedKey);
            return;
        }

        try
        {
            var payload = JsonSerializer.Serialize(item);
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
                return false;

            if (_circuitOpenUntil > DateTimeOffset.UtcNow)
                return true;

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

    private void RegisterFailure(Exception ex, string key, string operation)
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
            logger.LogWarning(ex,
                "Redis {Operation} failed for {CacheKey}. Circuit opened {Seconds}s.",
                operation, key, CircuitOpenDuration.TotalSeconds);
        }
        else
        {
            logger.LogWarning(ex,
                "Redis {Operation} failed for {CacheKey}. Using memory fallback.",
                operation, key);
        }
    }

    private string BuildKey(string key)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
        var prefix = string.IsNullOrWhiteSpace(_options.KeyPrefix)
            ? "toolnexus"
            : _options.KeyPrefix.Trim();

        return $"{prefix}:{hash}";
    }
}
