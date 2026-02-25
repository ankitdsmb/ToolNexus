using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IExecutionLedgerService
{
    Task<ExecutionLedgerPage> GetExecutionsAsync(ExecutionLedgerQuery query, CancellationToken cancellationToken);
    Task<ExecutionLedgerDetail?> GetExecutionByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<ExecutionLedgerSnapshot?> GetSnapshotByExecutionIdAsync(Guid id, CancellationToken cancellationToken);
}
