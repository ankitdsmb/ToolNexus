using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminAnalyticsService
{
    Task<AdminAnalyticsDashboard> GetDashboardAsync(CancellationToken cancellationToken);
}

