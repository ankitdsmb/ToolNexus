using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAdminControlPlaneRepository
{
    Task<int> DrainAuditQueueAsync(CancellationToken cancellationToken);
    Task<int> ReplayAuditDeadLettersAsync(CancellationToken cancellationToken);
    Task RecordOperationAsync(string operationDomain, string operationName, string resultStatus, object payload, CancellationToken cancellationToken);
    Task RecordOperatorCommandAsync(string commandType, OperatorCommandRequest request, string resultStatus, string correlationId, string? rollbackInfo, CancellationToken cancellationToken);
}
