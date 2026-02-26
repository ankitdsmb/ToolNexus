using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminControlPlaneService
{
    Task<AdminControlPlaneOperationResult> ResetCachesAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken);
    Task<AdminControlPlaneOperationResult> DrainAuditQueueAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken);
    Task<AdminControlPlaneOperationResult> ReplayAuditDeadLettersAsync(OperatorCommandRequest commandRequest, CancellationToken cancellationToken);
}
