using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IPlatformOptimizationRepository
{
    Task<IReadOnlyList<OptimizationRecommendationDetail>> GetPendingRecommendationsByDomainAsync(string domain, int take, CancellationToken cancellationToken);
    Task<OptimizationRecommendationDetail?> GetRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken);
    Task RecordDecisionAsync(Guid recommendationId, string status, OptimizationDecisionRequest request, CancellationToken cancellationToken);
}
