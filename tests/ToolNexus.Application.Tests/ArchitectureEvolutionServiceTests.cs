using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ArchitectureEvolutionServiceTests
{
    [Fact]
    public async Task RunDriftDetection_GeneratesReportsForHighSeveritySignals()
    {
        var repository = new InMemoryArchitectureEvolutionRepository();
        var service = CreateService(repository);

        await service.IngestSignalAsync(new EvolutionSignalIngestRequest("adapter.complexity", EvolutionDomains.ExecutionLayer, 0.92m, "corr-1", "tenant-1", "dotnet", "{}", DateTime.UtcNow), CancellationToken.None);
        await service.IngestSignalAsync(new EvolutionSignalIngestRequest("adapter.complexity", EvolutionDomains.ExecutionLayer, 0.88m, "corr-1", "tenant-1", "dotnet", "{}", DateTime.UtcNow), CancellationToken.None);

        var count = await service.RunDriftDetectionAsync(CancellationToken.None);

        Assert.Equal(1, count);
        var dashboard = await service.GetDashboardAsync(10, CancellationToken.None);
        Assert.Single(dashboard.DriftAlerts);
    }

    [Fact]
    public async Task GenerateRecommendations_RequiresSimulationAndPendingReviewState()
    {
        var repository = new InMemoryArchitectureEvolutionRepository();
        var service = CreateService(repository);

        await service.IngestSignalAsync(new EvolutionSignalIngestRequest("governance.friction", EvolutionDomains.Governance, 0.9m, "corr-2", "tenant-1", "dotnet", "{}", DateTime.UtcNow), CancellationToken.None);
        await service.RunDriftDetectionAsync(CancellationToken.None);

        var generated = await service.GenerateRecommendationsAsync(CancellationToken.None);

        Assert.Equal(1, generated);
        var dashboard = await service.GetDashboardAsync(10, CancellationToken.None);
        Assert.Single(dashboard.EvolutionSuggestions);
        Assert.Single(dashboard.SimulationReports);
        Assert.Equal("pending-review", dashboard.EvolutionSuggestions[0].Status);
    }

    private static ArchitectureEvolutionService CreateService(IArchitectureEvolutionRepository repository)
        => new(repository, Microsoft.Extensions.Options.Options.Create(new ArchitectureEvolutionOptions()), NullLogger<ArchitectureEvolutionService>.Instance);

    private sealed class InMemoryArchitectureEvolutionRepository : IArchitectureEvolutionRepository
    {
        private readonly List<ArchitectureEvolutionSignal> _signals = [];
        private readonly List<ArchitectureDriftReport> _drifts = [];
        private readonly List<EvolutionRecommendation> _recommendations = [];
        private readonly List<EvolutionSimulationReport> _simulations = [];
        private readonly List<ArchitectDecision> _decisions = [];

        public Task AddSignalAsync(ArchitectureEvolutionSignal signal, CancellationToken cancellationToken) { _signals.Add(signal); return Task.CompletedTask; }
        public Task<IReadOnlyList<ArchitectureEvolutionSignal>> GetSignalsAsync(DateTime sinceUtc, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<ArchitectureEvolutionSignal>>(_signals.Where(x => x.DetectedAtUtc >= sinceUtc).ToList());
        public Task UpsertDriftReportAsync(ArchitectureDriftReport driftReport, CancellationToken cancellationToken) { _drifts.Add(driftReport); return Task.CompletedTask; }
        public Task<IReadOnlyList<ArchitectureDriftReport>> GetLatestDriftReportsAsync(int limit, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<ArchitectureDriftReport>>(_drifts.OrderByDescending(x => x.DetectedAtUtc).Take(limit).ToList());
        public Task AddRecommendationAsync(EvolutionRecommendation recommendation, CancellationToken cancellationToken) { _recommendations.Add(recommendation); return Task.CompletedTask; }
        public Task<IReadOnlyList<EvolutionRecommendation>> GetPendingRecommendationsAsync(int limit, CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<EvolutionRecommendation>>(_recommendations.Where(x => x.Status.Contains("pending")).Take(limit).ToList());
        public Task AddSimulationReportAsync(EvolutionSimulationReport report, CancellationToken cancellationToken) { _simulations.Add(report); return Task.CompletedTask; }
        public Task<EvolutionSimulationReport?> GetLatestSimulationByRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken) => Task.FromResult(_simulations.Where(x => x.RecommendationId == recommendationId).OrderByDescending(x => x.SimulatedAtUtc).FirstOrDefault());
        public Task RecordArchitectDecisionAsync(ArchitectDecision decision, CancellationToken cancellationToken) { _decisions.Add(decision); return Task.CompletedTask; }
        public Task<bool> ExistsRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken) => Task.FromResult(_recommendations.Any(x => x.RecommendationId == recommendationId));
        public Task UpdateRecommendationStatusAsync(Guid recommendationId, string status, CancellationToken cancellationToken)
        {
            var i = _recommendations.FindIndex(x => x.RecommendationId == recommendationId);
            if (i >= 0) _recommendations[i] = _recommendations[i] with { Status = status };
            return Task.CompletedTask;
        }
    }
}
