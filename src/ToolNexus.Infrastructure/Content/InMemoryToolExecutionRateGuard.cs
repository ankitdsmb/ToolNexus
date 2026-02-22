using Microsoft.Extensions.Caching.Memory;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Content;

public sealed class InMemoryToolExecutionRateGuard(IMemoryCache cache) : IToolExecutionRateGuard
{
    public bool TryAcquire(string slug, int maxRequestsPerMinute)
    {
        var key = $"tool-rate::{slug.ToLowerInvariant()}::{DateTimeOffset.UtcNow:yyyyMMddHHmm}";
        var count = cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return 0;
        });

        var next = (int)count + 1;
        cache.Set(key, next, TimeSpan.FromMinutes(1));
        return next <= maxRequestsPerMinute;
    }
}
