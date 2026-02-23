namespace ToolNexus.Application.Services;

public interface IPlatformCacheService : IDistributedPlatformCache
{
    void Remove(string key);
    void RemoveByPrefix(string prefix);
}
