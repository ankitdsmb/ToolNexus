using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminControlPlaneService
{
    Task<AdminControlPlaneOperationResult> ResetCachesAsync(CancellationToken cancellationToken);
    Task<AdminControlPlaneOperationResult> DrainAuditQueueAsync(CancellationToken cancellationToken);
    Task<AdminControlPlaneOperationResult> ReplayAuditDeadLettersAsync(CancellationToken cancellationToken);
}

