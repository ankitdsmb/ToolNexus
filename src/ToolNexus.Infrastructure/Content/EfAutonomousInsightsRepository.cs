using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAutonomousInsightsRepository(ToolNexusContentDbContext dbContext) : IAutonomousInsightsRepository
{
    public async Task<IReadOnlyList<AutonomousInsightItem>> GetPendingInsightsAsync(int take, CancellationToken cancellationToken)
    {
        var insights = await dbContext.PlatformInsights
            .AsNoTracking()
            .Where(x => x.Status == "pending")
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);

        return insights.Select(Map).ToList();
    }

    public async Task<AutonomousInsightItem?> GetInsightAsync(Guid insightId, CancellationToken cancellationToken)
    {
        var insight = await dbContext.PlatformInsights.AsNoTracking().FirstOrDefaultAsync(x => x.Id == insightId, cancellationToken);
        return insight is null ? null : Map(insight);
    }

    public async Task RecordDecisionAsync(Guid insightId, string decision, AutonomousInsightDecisionRequest request, CancellationToken cancellationToken)
    {
        var insight = await dbContext.PlatformInsights.FirstAsync(x => x.Id == insightId, cancellationToken);
        if (!string.Equals(insight.Status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        insight.Status = decision;
        insight.DecisionedAtUtc = DateTime.UtcNow;
        insight.DecisionedBy = request.OperatorId;

        dbContext.OperatorApprovedActions.Add(new OperatorApprovedActionEntity
        {
            Id = Guid.NewGuid(),
            InsightId = insightId,
            OperatorId = request.OperatorId,
            Decision = decision,
            AuthorityContext = request.AuthorityContext,
            CorrelationId = insight.CorrelationId,
            ActionType = insight.RecommendedAction,
            Notes = request.Notes,
            TimestampUtc = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static AutonomousInsightItem Map(PlatformInsightEntity x)
    {
        var relatedIds = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(x.RelatedSignalIds) ?? [];
        return new AutonomousInsightItem(x.Id, relatedIds, x.RecommendedAction, x.ImpactScope, x.RiskScore, x.ConfidenceScore, x.CorrelationId, x.AuthorityContext, x.CreatedAtUtc, x.Status);
    }
}
