using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IGovernanceDecisionRepository
{
    Task<GovernanceDecisionPage> GetDecisionsAsync(GovernanceDecisionQuery query, CancellationToken cancellationToken);
    Task<GovernanceDecisionRecord?> GetByIdAsync(Guid decisionId, CancellationToken cancellationToken);
}
