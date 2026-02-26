using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAutonomousInsightsService
{
    Task<AutonomousInsightsPanel> GetPanelAsync(int take, CancellationToken cancellationToken);
    Task<bool> ApproveAsync(Guid insightId, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken);
    Task<bool> RejectAsync(Guid insightId, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken);
}
