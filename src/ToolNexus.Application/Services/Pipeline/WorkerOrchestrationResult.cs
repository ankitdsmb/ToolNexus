using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public sealed record WorkerOrchestrationResult(
    WorkerPreparationResult Preparation,
    bool LeaseAcquired,
    WorkerLeaseState WorkerLeaseState);
