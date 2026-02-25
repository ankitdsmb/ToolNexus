using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolQualityScoreService
{
    Task<ToolQualityScoreDashboard> GetDashboardAsync(ToolQualityScoreQuery query, CancellationToken cancellationToken);
}
