using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfPlatformOptimizationRepository(ToolNexusContentDbContext dbContext) : IPlatformOptimizationRepository
{
    public async Task<IReadOnlyList<OptimizationRecommendationDetail>> GetPendingRecommendationsByDomainAsync(string domain, int take, CancellationToken cancellationToken)
    {
        var recommendations = await dbContext.OptimizationRecommendations
            .AsNoTracking()
            .Where(x => x.Domain == domain && x.Status == "pending")
            .OrderByDescending(x => x.GeneratedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);

        var recommendationIds = recommendations.Select(x => x.RecommendationId).ToArray();
        var simulations = await dbContext.OptimizationSimulations
            .AsNoTracking()
            .Where(x => recommendationIds.Contains(x.RecommendationId))
            .GroupBy(x => x.RecommendationId)
            .Select(x => x.OrderByDescending(y => y.SimulatedAtUtc).First())
            .ToListAsync(cancellationToken);

        var simulationMap = simulations.ToDictionary(x => x.RecommendationId, x => x);
        return recommendations.Select(x =>
        {
            simulationMap.TryGetValue(x.RecommendationId, out var simulation);
            return new OptimizationRecommendationDetail(MapRecommendation(x), simulation is null ? null : MapSimulation(simulation));
        }).ToList();
    }

    public async Task<OptimizationRecommendationDetail?> GetRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken)
    {
        var recommendation = await dbContext.OptimizationRecommendations.AsNoTracking().FirstOrDefaultAsync(x => x.RecommendationId == recommendationId, cancellationToken);
        if (recommendation is null)
        {
            return null;
        }

        var simulation = await dbContext.OptimizationSimulations
            .AsNoTracking()
            .Where(x => x.RecommendationId == recommendationId)
            .OrderByDescending(x => x.SimulatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return new OptimizationRecommendationDetail(MapRecommendation(recommendation), simulation is null ? null : MapSimulation(simulation));
    }

    public async Task RecordDecisionAsync(Guid recommendationId, string status, OptimizationDecisionRequest request, CancellationToken cancellationToken)
    {
        var recommendation = await dbContext.OptimizationRecommendations.FirstAsync(x => x.RecommendationId == recommendationId, cancellationToken);
        if (!string.Equals(recommendation.Status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        recommendation.Status = status;

        dbContext.OptimizationApplications.Add(new OptimizationApplicationEntity
        {
            ApplicationId = Guid.NewGuid(),
            RecommendationId = recommendationId,
            ActionType = status,
            OperatorId = request.OperatorId,
            AuthorityContext = request.AuthorityContext,
            Notes = request.Notes,
            ScheduledForUtc = request.ScheduledForUtc,
            AppliedAtUtc = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static OptimizationRecommendationItem MapRecommendation(OptimizationRecommendationEntity x)
        => new(
            x.RecommendationId,
            x.Domain,
            x.TargetNodeId,
            x.Reason,
            x.ConfidenceScore,
            x.SuggestedChange,
            x.RiskImpact,
            x.ExpectedBenefit,
            x.CorrelationId,
            x.TenantId,
            x.RollbackMetadata,
            x.GeneratedAtUtc,
            x.Status);

    private static OptimizationSimulationResult MapSimulation(OptimizationSimulationEntity x)
        => new(x.SimulationId, x.RecommendationId, x.SimulationSummary, x.ProjectedRiskDelta, x.ProjectedBenefitDelta, x.ApprovedForReview, x.SimulatedAtUtc);
}
