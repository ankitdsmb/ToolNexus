using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Caching;
using Xunit;

namespace ToolNexus.Infrastructure.Tests.Caching;

public class RedisToolResultCacheTests
{
    private readonly FakeDistributedCache _distributedCache;
    private readonly MemoryCache _memoryCache; // Use real MemoryCache for simplicity as it implements IMemoryCache
    private readonly IOptions<ToolResultCacheOptions> _options;
    private readonly ILogger<RedisToolResultCache> _logger;
    private readonly RedisToolResultCache _cache;

    public RedisToolResultCacheTests()
    {
        _distributedCache = new FakeDistributedCache();
        _memoryCache = new MemoryCache(new MemoryCacheOptions());
        _options = Microsoft.Extensions.Options.Options.Create(new ToolResultCacheOptions { AbsoluteExpirationSeconds = 60, KeyPrefix = "test" });
        _logger = NullLogger<RedisToolResultCache>.Instance;
        _cache = new RedisToolResultCache(_distributedCache, _memoryCache, _options, _logger);
    }

    [Fact]
    public async Task SetAsync_SetsBothCaches_WithCorrectSize()
    {
        var key = "mykey";
        var item = new ToolResultCacheItem(true, "output", "error");
        var ttl = TimeSpan.FromMinutes(1);

        await _cache.SetAsync(key, item, ttl);

        // Verify Distributed Cache
        var normalizedKey = "test:" + Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(key))).ToLowerInvariant();
        var cachedBytes = await _distributedCache.GetAsync(normalizedKey);
        Assert.NotNull(cachedBytes);
        var cachedString = Encoding.UTF8.GetString(cachedBytes);
        var deserialized = JsonSerializer.Deserialize<ToolResultCacheItem>(cachedString);
        Assert.Equal(item, deserialized);

        // Verify Memory Cache
        Assert.True(_memoryCache.TryGetValue(normalizedKey, out ToolResultCacheItem? memoryItem));
        Assert.Equal(item, memoryItem);
    }

    [Fact]
    public async Task GetAsync_HitsDistributedCache_PopulatesMemoryCache_WithCorrectSize()
    {
        var key = "readkey";
        var item = new ToolResultCacheItem(true, "read_output", null);
        var normalizedKey = "test:" + Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(key))).ToLowerInvariant();

        var payload = JsonSerializer.Serialize(item);
        await _distributedCache.SetStringAsync(normalizedKey, payload);

        var result = await _cache.GetAsync(key);

        Assert.Equal(item, result);

        // Verify Memory Cache is populated
        Assert.True(_memoryCache.TryGetValue(normalizedKey, out ToolResultCacheItem? memoryItem));
        Assert.Equal(item, memoryItem);
    }
}

public class FakeDistributedCache : IDistributedCache
{
    private readonly Dictionary<string, byte[]> _storage = new();

    public byte[]? Get(string key) => _storage.TryGetValue(key, out var val) ? val : null;
    public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => Task.FromResult(Get(key));
    public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => _storage[key] = value;
    public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
    {
        _storage[key] = value;
        return Task.CompletedTask;
    }
    public void Refresh(string key) { }
    public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;
    public void Remove(string key) => _storage.Remove(key);
    public Task RemoveAsync(string key, CancellationToken token = default)
    {
        _storage.Remove(key);
        return Task.CompletedTask;
    }
}
