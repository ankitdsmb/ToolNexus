using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IWorkerRuntimeManager
{
    Task<WorkerPreparationResult> PrepareExecutionAsync(WorkerExecutionEnvelope envelope, CancellationToken cancellationToken);
}
