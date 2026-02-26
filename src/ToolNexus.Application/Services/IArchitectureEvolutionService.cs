using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IArchitectureEvolutionService
{
    Task<ArchitectureEvolutionSignal> IngestSignalAsync(EvolutionSignalIngestRequest request, CancellationToken cancellationToken);
    Task<int> RunDriftDetectionAsync(CancellationToken cancellationToken);
    Task<int> GenerateRecommendationsAsync(CancellationToken cancellationToken);
    Task<EvolutionDashboard> GetDashboardAsync(int limit, CancellationToken cancellationToken);
    Task<bool> RecordArchitectDecisionAsync(Guid recommendationId, ArchitectDecisionRequest request, CancellationToken cancellationToken);
}
