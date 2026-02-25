using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfGovernanceDecisionRepository(ToolNexusContentDbContext dbContext) : IGovernanceDecisionRepository
{
    public async Task<GovernanceDecisionPage> GetDecisionsAsync(GovernanceDecisionQuery query, CancellationToken cancellationToken)
    {
        var baseQuery = dbContext.GovernanceDecisions.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.ToolId))
        {
            baseQuery = baseQuery.Where(x => x.ToolId == query.ToolId);
        }

        if (!string.IsNullOrWhiteSpace(query.PolicyVersion))
        {
            baseQuery = baseQuery.Where(x => x.PolicyVersion == query.PolicyVersion);
        }

        if (query.StartDateUtc.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.TimestampUtc >= query.StartDateUtc.Value);
        }

        if (query.EndDateUtc.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.TimestampUtc <= query.EndDateUtc.Value);
        }

        var total = await baseQuery.CountAsync(cancellationToken);
        var skip = (query.Page - 1) * query.PageSize;

        var items = await baseQuery
            .OrderByDescending(x => x.TimestampUtc)
            .Skip(skip)
            .Take(query.PageSize)
            .Select(x => new GovernanceDecisionRecord(
                x.DecisionId,
                x.ToolId,
                x.CapabilityId,
                x.Authority,
                x.ApprovedBy,
                x.DecisionReason,
                x.PolicyVersion,
                x.TimestampUtc,
                Enum.Parse<GovernanceDecisionStatus>(x.Status, true)))
            .ToListAsync(cancellationToken);

        return new GovernanceDecisionPage(query.Page, query.PageSize, total, items);
    }

    public async Task<GovernanceDecisionRecord?> GetByIdAsync(Guid decisionId, CancellationToken cancellationToken)
    {
        return await dbContext.GovernanceDecisions
            .AsNoTracking()
            .Where(x => x.DecisionId == decisionId)
            .Select(x => new GovernanceDecisionRecord(
                x.DecisionId,
                x.ToolId,
                x.CapabilityId,
                x.Authority,
                x.ApprovedBy,
                x.DecisionReason,
                x.PolicyVersion,
                x.TimestampUtc,
                Enum.Parse<GovernanceDecisionStatus>(x.Status, true)))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
