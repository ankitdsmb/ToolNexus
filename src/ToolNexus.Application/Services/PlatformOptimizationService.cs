using System.Linq;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class PlatformOptimizationService(
    IPlatformOptimizationRepository repository,
    ILogger<PlatformOptimizationService> logger) : IPlatformOptimizationService
{
    public async Task<OptimizationDashboard> GetDashboardAsync(int takePerDomain, CancellationToken cancellationToken)
    {
        var safeTake = Math.Clamp(takePerDomain, 1, 50);

        var runtime = await repository.GetPendingRecommendationsByDomainAsync(OptimizationDomains.Runtime, safeTake, cancellationToken);
        var governance = await repository.GetPendingRecommendationsByDomainAsync(OptimizationDomains.Governance, safeTake, cancellationToken);
        var ux = await repository.GetPendingRecommendationsByDomainAsync(OptimizationDomains.Ux, safeTake, cancellationToken);
        var quality = await repository.GetPendingRecommendationsByDomainAsync(OptimizationDomains.Quality, safeTake, cancellationToken);
        var ai = await repository.GetPendingRecommendationsByDomainAsync(OptimizationDomains.AiCapability, safeTake, cancellationToken);

        logger.LogInformation("optimization.generated runtime={RuntimeCount} governance={GovernanceCount} ux={UxCount} quality={QualityCount} ai={AiCount}", runtime.Count, governance.Count, ux.Count, quality.Count, ai.Count);
        logger.LogInformation("optimization.simulated total={TotalSimulated}", runtime.Count(x => x.LatestSimulation is not null) + governance.Count(x => x.LatestSimulation is not null) + ux.Count(x => x.LatestSimulation is not null) + quality.Count(x => x.LatestSimulation is not null) + ai.Count(x => x.LatestSimulation is not null));

        return new OptimizationDashboard(runtime, governance, ux, quality, ai);
    }

    public Task<bool> ApproveAsync(Guid recommendationId, OptimizationDecisionRequest request, CancellationToken cancellationToken)
        => DecideAsync(recommendationId, "approved", "optimization.approved", request, cancellationToken);

    public Task<bool> RejectAsync(Guid recommendationId, OptimizationDecisionRequest request, CancellationToken cancellationToken)
        => DecideAsync(recommendationId, "rejected", "optimization.rejected", request, cancellationToken);

    public async Task<bool> ScheduleRolloutAsync(Guid recommendationId, OptimizationDecisionRequest request, CancellationToken cancellationToken)
    {
        var applied = await DecideAsync(recommendationId, "scheduled", "optimization.applied", request, cancellationToken);
        if (applied)
        {
            logger.LogInformation("optimization.impact_measured recommendation={RecommendationId}", recommendationId);
        }

        return applied;
    }

    private async Task<bool> DecideAsync(Guid recommendationId, string status, string telemetryEvent, OptimizationDecisionRequest request, CancellationToken cancellationToken)
    {
        var recommendation = await repository.GetRecommendationAsync(recommendationId, cancellationToken);
        if (recommendation is null || recommendation.LatestSimulation is null)
        {
            return false;
        }

        await repository.RecordDecisionAsync(recommendationId, status, request, cancellationToken);
        logger.LogInformation(
            "{TelemetryEvent} operator={OperatorId} authority={AuthorityContext} recommendation={RecommendationId} domain={Domain} correlation={CorrelationId}",
            telemetryEvent,
            request.OperatorId,
            request.AuthorityContext,
            recommendationId,
            recommendation.Recommendation.Domain,
            recommendation.Recommendation.CorrelationId);

        return true;
    }
}
