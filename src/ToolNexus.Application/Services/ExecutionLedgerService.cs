using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ExecutionLedgerService(IExecutionLedgerRepository repository) : IExecutionLedgerService
{
    public Task<ExecutionLedgerPage> GetExecutionsAsync(ExecutionLedgerQuery query, CancellationToken cancellationToken)
    {
        var safe = query with
        {
            Page = query.Page <= 0 ? 1 : query.Page,
            PageSize = Math.Clamp(query.PageSize, 1, 200)
        };

        return repository.GetExecutionsAsync(safe, cancellationToken);
    }

    public Task<ExecutionLedgerDetail?> GetExecutionByIdAsync(Guid id, CancellationToken cancellationToken)
        => repository.GetExecutionByIdAsync(id, cancellationToken);

    public Task<ExecutionLedgerSnapshot?> GetSnapshotByExecutionIdAsync(Guid id, CancellationToken cancellationToken)
        => repository.GetSnapshotByExecutionIdAsync(id, cancellationToken);
}
