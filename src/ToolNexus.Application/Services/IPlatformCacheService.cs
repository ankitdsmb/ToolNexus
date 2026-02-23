namespace ToolNexus.Application.Services;

public interface IPlatformCacheService
{
    Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken cancellationToken = default);
    void Remove(string key);
    void RemoveByPrefix(string prefix);
}
