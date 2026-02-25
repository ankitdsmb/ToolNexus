using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class WorkerExecutionOrchestratorTests
{
    [Fact]
    public async Task PrepareExecutionAsync_AcquiresAndReleasesLease()
    {
        var pool = new TestWorkerPoolCoordinator();
        var manager = new StubRuntimeManager();
        var orchestrator = new WorkerExecutionOrchestrator(pool, manager);
        var envelope = WorkerExecutionEnvelope.Create("py-tool", "run", "{}", null, null, "corr", "tenant");
        var workerType = WorkerType.Create(ToolRuntimeLanguage.Python, ToolExecutionCapability.Sandboxed);

        var result = await orchestrator.PrepareExecutionAsync(envelope, workerType, CancellationToken.None);

        Assert.True(pool.AcquireCalls == 1);
        Assert.True(pool.ReleaseCalls == 1);
        Assert.True(result.LeaseAcquired);
        Assert.Equal(WorkerLeaseState.Busy, result.WorkerLeaseState);
    }

    [Fact]
    public async Task PrepareExecutionAsync_ReleasesLease_WhenRuntimePreparationFails()
    {
        var pool = new TestWorkerPoolCoordinator();
        var manager = new ThrowingRuntimeManager();
        var orchestrator = new WorkerExecutionOrchestrator(pool, manager);
        var envelope = WorkerExecutionEnvelope.Create("py-tool", "run", "{}", null, null, null, null);
        var workerType = WorkerType.Create(ToolRuntimeLanguage.Python, ToolExecutionCapability.Standard);

        await Assert.ThrowsAsync<InvalidOperationException>(() => orchestrator.PrepareExecutionAsync(envelope, workerType, CancellationToken.None));

        Assert.Equal(1, pool.AcquireCalls);
        Assert.Equal(1, pool.ReleaseCalls);
        Assert.NotNull(pool.LastReleasedLease);
        Assert.Equal(WorkerLeaseState.Released, pool.LastReleasedLease!.State);
    }

    private sealed class TestWorkerPoolCoordinator : IWorkerPoolCoordinator
    {
        public int AcquireCalls { get; private set; }
        public int ReleaseCalls { get; private set; }
        public WorkerLease? LastReleasedLease { get; private set; }

        public Task<WorkerLease> AcquireLeaseAsync(WorkerType workerType, CancellationToken cancellationToken)
        {
            AcquireCalls++;
            return Task.FromResult(WorkerLease.Create(workerType, TimeSpan.FromMinutes(1)));
        }

        public Task ReleaseLeaseAsync(WorkerLease lease, CancellationToken cancellationToken)
        {
            ReleaseCalls++;
            LastReleasedLease = lease;
            return Task.CompletedTask;
        }
    }

    private sealed class StubRuntimeManager : IWorkerRuntimeManager
    {
        public Task<WorkerPreparationResult> PrepareExecutionAsync(WorkerExecutionEnvelope envelope, CancellationToken cancellationToken)
            => Task.FromResult(WorkerPreparationResult.Placeholder);
    }

    private sealed class ThrowingRuntimeManager : IWorkerRuntimeManager
    {
        public Task<WorkerPreparationResult> PrepareExecutionAsync(WorkerExecutionEnvelope envelope, CancellationToken cancellationToken)
            => throw new InvalidOperationException("runtime unavailable");
    }
}
