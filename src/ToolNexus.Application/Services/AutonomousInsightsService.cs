using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class AutonomousInsightsService(
    IAutonomousInsightsRepository repository,
    ILogger<AutonomousInsightsService> logger) : IAutonomousInsightsService
{
    public async Task<AutonomousInsightsPanel> GetPanelAsync(int take, CancellationToken cancellationToken)
    {
        var safeTake = Math.Clamp(take, 1, 50);
        var items = await repository.GetPendingInsightsAsync(safeTake, cancellationToken);
        return new AutonomousInsightsPanel(items);
    }

    public async Task<bool> ApproveAsync(Guid insightId, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken)
    {
        var insight = await repository.GetInsightAsync(insightId, cancellationToken);
        if (insight is null)
        {
            return false;
        }

        await repository.RecordDecisionAsync(insightId, "approved", request, cancellationToken);
        logger.LogInformation("autonomy.insight.approved operator={OperatorId} authority={AuthorityContext} correlation={CorrelationId}", request.OperatorId, request.AuthorityContext, insight.CorrelationId);
        return true;
    }

    public async Task<bool> RejectAsync(Guid insightId, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken)
    {
        var insight = await repository.GetInsightAsync(insightId, cancellationToken);
        if (insight is null)
        {
            return false;
        }

        await repository.RecordDecisionAsync(insightId, "rejected", request, cancellationToken);
        logger.LogInformation("autonomy.insight.rejected operator={OperatorId} authority={AuthorityContext} correlation={CorrelationId}", request.OperatorId, request.AuthorityContext, insight.CorrelationId);
        return true;
    }
}
