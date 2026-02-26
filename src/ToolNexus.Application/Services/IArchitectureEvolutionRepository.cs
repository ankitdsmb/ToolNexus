using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IArchitectureEvolutionRepository
{
    Task AddSignalAsync(ArchitectureEvolutionSignal signal, CancellationToken cancellationToken);
    Task<IReadOnlyList<ArchitectureEvolutionSignal>> GetSignalsAsync(DateTime sinceUtc, CancellationToken cancellationToken);
    Task UpsertDriftReportAsync(ArchitectureDriftReport driftReport, CancellationToken cancellationToken);
    Task<IReadOnlyList<ArchitectureDriftReport>> GetLatestDriftReportsAsync(int limit, CancellationToken cancellationToken);
    Task AddRecommendationAsync(EvolutionRecommendation recommendation, CancellationToken cancellationToken);
    Task<IReadOnlyList<EvolutionRecommendation>> GetPendingRecommendationsAsync(int limit, CancellationToken cancellationToken);
    Task AddSimulationReportAsync(EvolutionSimulationReport report, CancellationToken cancellationToken);
    Task<EvolutionSimulationReport?> GetLatestSimulationByRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken);
    Task RecordArchitectDecisionAsync(ArchitectDecision decision, CancellationToken cancellationToken);
    Task<bool> ExistsRecommendationAsync(Guid recommendationId, CancellationToken cancellationToken);
    Task UpdateRecommendationStatusAsync(Guid recommendationId, string status, CancellationToken cancellationToken);
}
