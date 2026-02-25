using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Tests;

public sealed class LanguageExecutionAdaptersTests
{
    [Fact]
    public async Task PythonExecutionAdapter_UsesOrchestratorLeaseFlow_AndWorkerManager()
    {
        var pool = new CapturingWorkerPoolCoordinator();
        var manager = new CapturingWorkerRuntimeManager();
        var orchestrator = new WorkerExecutionOrchestrator(pool, manager);
        var adapter = new PythonExecutionAdapter(orchestrator);
        var context = CreateContext();
        var request = UniversalToolExecutionRequest.FromToolExecutionRequest(
            new ToolExecutionRequest("py-tool", "run", "{\"x\":1}", new Dictionary<string, string>()),
            ToolRuntimeLanguage.Python,
            "1.0.0",
            timeoutBudgetMs: 2000,
            executionPolicyId: "policy-1",
            resourceClass: "small",
            tenantId: "tenant-a",
            correlationId: "corr-1",
            executionCapability: ToolExecutionCapability.Sandboxed);

        var result = await adapter.ExecuteAsync(request, context, CancellationToken.None);

        Assert.False(result.Success);
        Assert.NotNull(manager.LastEnvelope);
        Assert.Equal("py-tool", manager.LastEnvelope!.ToolId);
        Assert.Equal("run", manager.LastEnvelope.Operation);
        Assert.Equal("corr-1", manager.LastEnvelope.CorrelationId);
        Assert.Equal("tenant-a", manager.LastEnvelope.TenantId);
        Assert.Equal("sandboxed", manager.LastEnvelope.ResourceLimits["capability"]);
        Assert.True(pool.AcquireCalled);
        Assert.True(pool.ReleaseCalled);
        Assert.Equal("python", pool.LastWorkerType?.Language.Value);
        Assert.Equal("sandboxed", pool.LastWorkerType?.Capability.Value);
        Assert.Equal("true", context.Items[UniversalExecutionEngine.WorkerManagerUsedContextKey]);
        Assert.Equal("true", context.Items[UniversalExecutionEngine.WorkerLeaseAcquiredContextKey]);
        Assert.Equal(WorkerLeaseState.Busy.ToString(), context.Items[UniversalExecutionEngine.WorkerLeaseStateContextKey]);
        Assert.Equal("true", context.Items[UniversalExecutionEngine.WorkerOrchestratorUsedContextKey]);
    }

    [Fact]
    public async Task DotNetExecutionAdapter_RemainsStrategyDriven()
    {
        var strategy = new StubApiToolExecutionStrategy();
        var adapter = new DotNetExecutionAdapter(strategy);
        var context = CreateContext();
        var request = UniversalToolExecutionRequest.FromToolExecutionRequest(
            new ToolExecutionRequest("json", "format", "{}", null),
            ToolRuntimeLanguage.DotNet,
            "1.0.0",
            timeoutBudgetMs: 1000);

        var result = await adapter.ExecuteAsync(request, context, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(1, strategy.Calls);
    }

    private static ToolExecutionContext CreateContext()
    {
        return new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new StubPolicy()
        };
    }

    private sealed class CapturingWorkerRuntimeManager : IWorkerRuntimeManager
    {
        public WorkerExecutionEnvelope? LastEnvelope { get; private set; }

        public Task<WorkerPreparationResult> PrepareExecutionAsync(WorkerExecutionEnvelope envelope, CancellationToken cancellationToken)
        {
            LastEnvelope = envelope;
            return Task.FromResult(WorkerPreparationResult.Placeholder);
        }
    }

    private sealed class CapturingWorkerPoolCoordinator : IWorkerPoolCoordinator
    {
        public bool AcquireCalled { get; private set; }
        public bool ReleaseCalled { get; private set; }
        public WorkerType? LastWorkerType { get; private set; }

        public Task<WorkerLease> AcquireLeaseAsync(WorkerType workerType, CancellationToken cancellationToken)
        {
            AcquireCalled = true;
            LastWorkerType = workerType;
            return Task.FromResult(WorkerLease.Create(workerType, TimeSpan.FromMinutes(2)));
        }

        public Task ReleaseLeaseAsync(WorkerLease lease, CancellationToken cancellationToken)
        {
            ReleaseCalled = true;
            return Task.CompletedTask;
        }
    }

    private sealed class StubApiToolExecutionStrategy : IApiToolExecutionStrategy
    {
        public int Calls { get; private set; }

        public Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default)
        {
            Calls++;
            return Task.FromResult(new ToolExecutionResponse(true, "ok"));
        }
    }

    private sealed class StubPolicy : IToolExecutionPolicy
    {
        public string Slug => "json";
        public string ExecutionMode => "api";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 30;
        public int MaxInputSize => 1000;
        public int MaxRequestsPerMinute => 60;
        public int CacheTtlSeconds => 0;
        public ToolHttpMethodPolicy AllowedHttpMethods => ToolHttpMethodPolicy.GetOrPost;
        public bool AllowAnonymous => true;
        public int MaxConcurrency => 2;
        public int RetryCount => 0;
        public int CircuitBreakerFailureThreshold => 5;
    }
}
