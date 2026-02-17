using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace ToolNexus.Infrastructure.HealthChecks;

public sealed class DistributedCacheHealthCheck(IServiceProvider serviceProvider) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var redisConnection = serviceProvider.GetService<IConnectionMultiplexer>();

        if (redisConnection is null)
        {
            return HealthCheckResult.Healthy("Redis is not configured. Using in-memory cache.");
        }

        try
        {
            var database = redisConnection.GetDatabase();
            var ping = await database.PingAsync();
            return HealthCheckResult.Healthy($"Redis ping: {ping.TotalMilliseconds:F0}ms");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Degraded("Redis is unreachable; in-memory fallback remains active.", ex);
        }
    }
}
