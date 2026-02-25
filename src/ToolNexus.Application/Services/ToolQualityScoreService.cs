using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolQualityScoreService(IToolQualityScoreRepository repository) : IToolQualityScoreService
{
    public Task<ToolQualityScoreDashboard> GetDashboardAsync(ToolQualityScoreQuery query, CancellationToken cancellationToken)
        => repository.GetDashboardAsync(query, cancellationToken);
}
