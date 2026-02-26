using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAutonomousInsightsRepository
{
    Task<IReadOnlyList<AutonomousInsightItem>> GetPendingInsightsAsync(int take, CancellationToken cancellationToken);
    Task<AutonomousInsightItem?> GetInsightAsync(Guid insightId, CancellationToken cancellationToken);
    Task RecordDecisionAsync(Guid insightId, string decision, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken);
}
