using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed class NoOpWorkerRuntimeManager : IWorkerRuntimeManager
{
    public Task<WorkerPreparationResult> PrepareExecutionAsync(WorkerExecutionEnvelope envelope, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(envelope);
        return Task.FromResult(WorkerPreparationResult.Placeholder);
    }
}
