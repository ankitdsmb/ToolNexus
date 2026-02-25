namespace ToolNexus.Application.Models;

/// <summary>
/// Immutable worker lease representing reserved worker capacity in the orchestration lifecycle.
/// </summary>
public sealed record WorkerLease
{
    public required string LeaseId { get; init; }
    public required WorkerType WorkerType { get; init; }
    public required DateTime AcquiredAtUtc { get; init; }
    public required TimeSpan MaxLifetime { get; init; }
    public required WorkerLeaseState State { get; init; }

    public static WorkerLease Create(WorkerType workerType, TimeSpan maxLifetime)
    {
        ArgumentNullException.ThrowIfNull(workerType);

        return new WorkerLease
        {
            LeaseId = Guid.NewGuid().ToString("n"),
            WorkerType = workerType,
            AcquiredAtUtc = DateTime.UtcNow,
            MaxLifetime = maxLifetime <= TimeSpan.Zero ? TimeSpan.FromMinutes(5) : maxLifetime,
            State = WorkerLeaseState.Warm
        };
    }

    public WorkerLease WithState(WorkerLeaseState state) => this with { State = state };
}
