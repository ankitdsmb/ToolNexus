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

    public Task<AdminAnalyticsDrilldownResult> GetDrilldownAsync(AdminAnalyticsQuery query, CancellationToken cancellationToken)
    {
        var tool = string.IsNullOrWhiteSpace(query.ToolSlug) ? "all" : query.ToolSlug.Trim().ToLowerInvariant();
        var key = $"{DashboardKey}:drilldown:{query.StartDate:yyyyMMdd}:{query.EndDate:yyyyMMdd}:{tool}:{query.Page}:{query.PageSize}";
        return cache.GetOrCreateAsync(key, token => inner.GetDrilldownAsync(query, token), _ttl, cancellationToken);
    }
}
