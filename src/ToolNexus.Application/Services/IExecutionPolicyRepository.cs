using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IExecutionPolicyRepository
{
    Task<ToolExecutionPolicyModel?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<ToolExecutionPolicyModel?> GetByToolIdAsync(int toolId, CancellationToken cancellationToken = default);
    Task<ToolExecutionPolicyModel?> UpsertBySlugAsync(string slug, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken = default);
}
