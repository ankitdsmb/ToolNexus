using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services;

public sealed class CachingAdminAnalyticsService(
    AdminAnalyticsService inner,
    IPlatformCacheService cache,
    IOptions<PlatformCacheOptions> options) : IAdminAnalyticsService
{
    private const string DashboardKey = "platform:analytics:dashboard";
    private readonly TimeSpan _ttl = TimeSpan.FromSeconds(options.Value.AnalyticsDashboardTtlSeconds);

    public Task<AdminAnalyticsDashboard> GetDashboardAsync(CancellationToken cancellationToken)
        => cache.GetOrCreateAsync(DashboardKey, inner.GetDashboardAsync, _ttl, cancellationToken);
}
