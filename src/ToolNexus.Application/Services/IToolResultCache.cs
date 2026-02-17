namespace ToolNexus.Application.Services;

public interface IToolResultCache
{
    Task<ToolResultCacheItem?> GetAsync(string key, CancellationToken cancellationToken);
    Task SetAsync(string key, ToolResultCacheItem item, TimeSpan expiration, CancellationToken cancellationToken);
}


