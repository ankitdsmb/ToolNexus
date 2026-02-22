using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IExecutionPolicyService
{
    Task<ToolExecutionPolicyModel> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<ToolExecutionPolicyModel?> GetByToolIdAsync(int toolId, CancellationToken cancellationToken = default);
    Task<ToolExecutionPolicyModel> UpdateBySlugAsync(string slug, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken = default);
    void Invalidate(string slug);
}
