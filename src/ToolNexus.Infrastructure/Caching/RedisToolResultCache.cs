using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Caching;

public sealed class RedisToolResultCache(
    IDistributedCache distributedCache,
    IMemoryCache memoryCache,
    IOptions<ToolResultCacheOptions> cacheOptions,
    ILogger<RedisToolResultCache> logger) : IToolResponseCache
{
    private readonly ToolResultCacheOptions _options = cacheOptions.Value ?? new ToolResultCacheOptions();

    public async Task<ToolExecutionResponse?> GetAsync(
        string slug,
        string action,
        string input,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug) || string.IsNullOrWhiteSpace(action) || input is null)
        {
            return null;
        }

        var normalizedKey = BuildKey(slug, action, input);
        if (memoryCache.TryGetValue<ToolExecutionResponse>(normalizedKey, out var localValue))
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

            var cachedValue = JsonSerializer.Deserialize<ToolExecutionResponse>(payload);
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

    public async Task SetAsync(
        string slug,
        string action,
        string input,
        ToolExecutionResponse response,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug) || string.IsNullOrWhiteSpace(action) || input is null)
        {
            return;
        }

        var normalizedKey = BuildKey(slug, action, input);
        var ttl = TimeSpan.FromSeconds(Math.Max(1, _options.AbsoluteExpirationSeconds));

        memoryCache.Set(normalizedKey, response, ttl);

        try
        {
            var payload = JsonSerializer.Serialize(response);
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

    private string BuildKey(string slug, string action, string input)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
        var prefix = string.IsNullOrWhiteSpace(_options.KeyPrefix) ? "toolnexus" : _options.KeyPrefix.Trim();
        return $"{prefix}:{slug}:{action}:{hash}";
    }
}
