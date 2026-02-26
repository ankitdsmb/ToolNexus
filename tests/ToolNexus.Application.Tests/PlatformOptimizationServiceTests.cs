using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class PlatformOptimizationServiceTests
{
    [Fact]
    public async Task GetDashboardAsync_GroupsByDomain()
    {
        var runtimeRecommendation = BuildRecommendation(OptimizationDomains.Runtime);
        var repository = new StubRepository([runtimeRecommendation]);
        var service = new PlatformOptimizationService(repository, NullLogger<PlatformOptimizationService>.Instance);

        var dashboard = await service.GetDashboardAsync(10, CancellationToken.None);

        Assert.Single(dashboard.RuntimeRecommendations);
        Assert.Empty(dashboard.GovernanceOptimization);
    }

    [Fact]
    public async Task ApproveAsync_RequiresSimulation()
    {
        var recommendation = new OptimizationRecommendationDetail(BuildRecommendationItem(OptimizationDomains.Runtime), null);
        var repository = new StubRepository([], recommendation);
        var service = new PlatformOptimizationService(repository, NullLogger<PlatformOptimizationService>.Instance);

        var approved = await service.ApproveAsync(recommendation.Recommendation.RecommendationId, new OptimizationDecisionRequest("op-1", "operator", null, null), CancellationToken.None);

        Assert.False(approved);
    }

    private static OptimizationRecommendationDetail BuildRecommendation(string domain)
        => new(BuildRecommendationItem(domain), new OptimizationSimulationResult(Guid.NewGuid(), Guid.NewGuid(), "ok", -0.2m, 0.4m, true, DateTime.UtcNow));

    private static OptimizationRecommendationItem BuildRecommendationItem(string domain)
        => new(Guid.NewGuid(), domain, "node-1", "reason", 0.8m, "change", "low", "high", "corr-1", "tenant-1", "{}", DateTime.UtcNow, "pending");

    private sealed class StubRepository(IReadOnlyList<OptimizationRecommendationDetail> records, OptimizationRecommendationDetail? byId = null) : IPlatformOptimizationRepository
    {
        public Task<IReadOnlyList<OptimizationRecommendationDetail>> GetPendingRecommendationsByDomainAsync(string domain, int take, CancellationToken cancellationToken)
            => Task.FromResult((IReadOnlyList<OptimizationRecommendationDetail>)records.Where(x => x.Recommendation.Domain == domain).ToList());

        public Task<OptimizationRecommendationDetail?> GetRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken)
            => Task.FromResult(byId);

        public Task RecordDecisionAsync(Guid recommendationId, string status, OptimizationDecisionRequest request, CancellationToken cancellationToken)
            => Task.CompletedTask;
    }
}
