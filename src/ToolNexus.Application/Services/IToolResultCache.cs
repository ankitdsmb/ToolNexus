namespace ToolNexus.Application.Services;

public interface IToolResultCache
{
    Task<ToolResultCacheItem?> GetAsync(string key, CancellationToken cancellationToken = default);

    Task SetAsync(string key, ToolResultCacheItem value, TimeSpan ttl, CancellationToken cancellationToken = default);
}
