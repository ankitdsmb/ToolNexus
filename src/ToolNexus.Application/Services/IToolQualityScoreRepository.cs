using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolQualityScoreRepository
{
    Task AddAsync(ToolQualityScoreRecord score, CancellationToken cancellationToken);
    Task<ToolQualityScoreRecord?> GetLatestByToolIdAsync(string toolId, CancellationToken cancellationToken);
    Task<ToolQualityScoreDashboard> GetDashboardAsync(ToolQualityScoreQuery query, CancellationToken cancellationToken);
}
