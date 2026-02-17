using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ToolNexus.Infrastructure.HealthChecks;

public sealed class DistributedCacheHealthCheck(IDistributedCache distributedCache) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var key = $"health:{Guid.NewGuid():N}";

        try
        {
            await distributedCache.SetStringAsync(
                key,
                "ok",
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1) },
                cancellationToken);

            var cachedValue = await distributedCache.GetStringAsync(key, cancellationToken);
            return cachedValue == "ok"
                ? HealthCheckResult.Healthy("Distributed cache is reachable.")
                : HealthCheckResult.Unhealthy("Distributed cache returned an unexpected value.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Degraded("Distributed cache is unavailable; in-memory fallback remains active.", ex);
        }
    }
}
