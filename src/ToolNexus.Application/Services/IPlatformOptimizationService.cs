using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IPlatformOptimizationService
{
    Task<OptimizationDashboard> GetDashboardAsync(int takePerDomain, CancellationToken cancellationToken);
    Task<bool> ApproveAsync(Guid recommendationId, OptimizationDecisionRequest request, CancellationToken cancellationToken);
    Task<bool> RejectAsync(Guid recommendationId, OptimizationDecisionRequest request, CancellationToken cancellationToken);
    Task<bool> ScheduleRolloutAsync(Guid recommendationId, OptimizationDecisionRequest request, CancellationToken cancellationToken);
}
