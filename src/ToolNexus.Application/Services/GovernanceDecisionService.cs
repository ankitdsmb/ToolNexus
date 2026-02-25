using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class GovernanceDecisionService(IGovernanceDecisionRepository repository) : IGovernanceDecisionService
{
    public Task<GovernanceDecisionPage> GetDecisionsAsync(GovernanceDecisionQuery query, CancellationToken cancellationToken)
    {
        var safe = query with
        {
            Page = query.Page <= 0 ? 1 : query.Page,
            PageSize = Math.Clamp(query.PageSize, 1, 200)
        };

        return repository.GetDecisionsAsync(safe, cancellationToken);
    }

    public Task<GovernanceDecisionRecord?> GetByIdAsync(Guid decisionId, CancellationToken cancellationToken)
        => repository.GetByIdAsync(decisionId, cancellationToken);
}
