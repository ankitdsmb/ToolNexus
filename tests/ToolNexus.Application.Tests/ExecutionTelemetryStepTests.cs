using System.Collections.Concurrent;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Pipeline.Steps;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ExecutionTelemetryStepTests
{
    [Fact]
    public async Task InvokeAsync_OnSuccess_LogsExecutionEvent()
    {
        var recorder = new BufferingExecutionEventService();
        var step = new ExecutionTelemetryStep(recorder);
        var context = CreateContext();

        var response = await step.InvokeAsync(
            context,
            (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")),
            CancellationToken.None);

        var evt = Assert.Single(recorder.Events);
        Assert.True(response.Success);
        Assert.True(evt.Success);
        Assert.Equal("json", evt.ToolSlug);
        Assert.Equal("server", evt.ExecutionMode);
        Assert.Equal(ExecutionAuthority.LegacyAuthoritative.ToString(), evt.ExecutionAuthority);
        Assert.Equal("false", evt.ShadowExecution);
    }

    [Fact]
    public async Task InvokeAsync_OnFailure_LogsErrorType()
    {
        var recorder = new BufferingExecutionEventService();
        var step = new ExecutionTelemetryStep(recorder);
        var context = CreateContext();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            step.InvokeAsync(context, (_, _) => throw new InvalidOperationException("boom"), CancellationToken.None));

        var evt = Assert.Single(recorder.Events);
        Assert.False(evt.Success);
        Assert.Equal(nameof(InvalidOperationException), evt.ErrorType);
    }

    [Fact]
    public async Task InvokeAsync_CapturesDuration()
    {
        var recorder = new BufferingExecutionEventService();
        var step = new ExecutionTelemetryStep(recorder);
        var context = CreateContext();

        await step.InvokeAsync(
            context,
            async (_, cancellationToken) =>
            {
                await Task.Delay(40, cancellationToken);
                return new ToolExecutionResponse(true, "ok");
            },
            CancellationToken.None);

        var evt = Assert.Single(recorder.Events);
        Assert.True(evt.DurationMs >= 30);
    }


    [Fact]
    public async Task InvokeAsync_IncludesAdapterTelemetryTags()
    {
        var recorder = new BufferingExecutionEventService();
        var step = new ExecutionTelemetryStep(recorder);
        var context = CreateContext();
        context.Items[UniversalExecutionEngine.LanguageContextKey] = "dotnet";
        context.Items[UniversalExecutionEngine.AdapterNameContextKey] = "DotNetExecutionAdapter";
        context.Items[UniversalExecutionEngine.AdapterResolutionStatusContextKey] = "resolved";
        context.Items[UniversalExecutionEngine.CapabilityContextKey] = "sandboxed";
        context.Items[UniversalExecutionEngine.WorkerManagerUsedContextKey] = "true";
        context.Items[UniversalExecutionEngine.WorkerLeaseAcquiredContextKey] = "true";
        context.Items[UniversalExecutionEngine.WorkerLeaseStateContextKey] = WorkerLeaseState.Busy.ToString();
        context.Items[UniversalExecutionEngine.WorkerOrchestratorUsedContextKey] = "true";
        context.Items[UniversalExecutionEngine.ExecutionAuthorityContextKey] = ExecutionAuthority.ShadowOnly.ToString();
        context.Items[UniversalExecutionEngine.ShadowExecutionContextKey] = "true";
        context.Items[UniversalExecutionEngine.ConformanceValidContextKey] = "false";
        context.Items[UniversalExecutionEngine.ConformanceNormalizedContextKey] = "true";
        context.Items[UniversalExecutionEngine.ConformanceIssueCountContextKey] = "2";
        context.Items[UniversalExecutionEngine.ExecutionSnapshotIdContextKey] = "snap-123";
        context.Items[UniversalExecutionEngine.SnapshotAuthorityContextKey] = ExecutionAuthority.ShadowOnly.ToString();
        context.Items[UniversalExecutionEngine.SnapshotLanguageContextKey] = "dotnet";
        context.Items[UniversalExecutionEngine.SnapshotCapabilityContextKey] = "sandboxed";
        context.Items[UniversalExecutionEngine.AdmissionAllowedContextKey] = "false";
        context.Items[UniversalExecutionEngine.AdmissionReasonContextKey] = "CapabilityBlocked";
        context.Items[UniversalExecutionEngine.AdmissionDecisionSourceContextKey] = "DefaultExecutionAdmissionController";

        await step.InvokeAsync(
            context,
            (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")),
            CancellationToken.None);

        var evt = Assert.Single(recorder.Events);
        Assert.Equal("dotnet", evt.Language);
        Assert.Equal("dotnet", evt.RuntimeLanguage);
        Assert.Equal("json", evt.ToolId);
        Assert.Equal("DotNetExecutionAdapter", evt.AdapterName);
        Assert.Equal("resolved", evt.AdapterResolutionStatus);
        Assert.Equal("sandboxed", evt.Capability);
        Assert.Equal("true", evt.WorkerManagerUsed);
        Assert.Equal("true", evt.LeaseAcquired);
        Assert.Equal(WorkerLeaseState.Busy.ToString(), evt.WorkerLeaseState);
        Assert.Equal("true", evt.OrchestratorUsed);
        Assert.Equal(ExecutionAuthority.ShadowOnly.ToString(), evt.ExecutionAuthority);
        Assert.Equal("true", evt.ShadowExecution);
        Assert.Equal("false", evt.ConformanceValid);
        Assert.Equal("true", evt.ConformanceNormalized);
        Assert.Equal(2, evt.ConformanceIssueCount);
        Assert.Equal("snap-123", evt.ExecutionSnapshotId);
        Assert.Equal(ExecutionAuthority.ShadowOnly.ToString(), evt.SnapshotAuthority);
        Assert.Equal("dotnet", evt.SnapshotLanguage);
        Assert.Equal("sandboxed", evt.SnapshotCapability);
        Assert.Equal("false", evt.AdmissionAllowed);
        Assert.Equal("CapabilityBlocked", evt.AdmissionReason);
        Assert.Equal("DefaultExecutionAdmissionController", evt.AdmissionDecisionSource);
    }

    [Fact]
    public async Task InvokeAsync_AsyncLogging_DoesNotBlockExecutionFlow()
    {
        var recorder = new BufferingExecutionEventService();
        var step = new ExecutionTelemetryStep(recorder);
        var context = CreateContext();

        var started = DateTime.UtcNow;
        await step.InvokeAsync(context, (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")), CancellationToken.None);
        var elapsed = DateTime.UtcNow - started;

        Assert.True(elapsed < TimeSpan.FromMilliseconds(100));
        Assert.Single(recorder.Events);
    }


    [Fact]
    public async Task InvokeAsync_WithoutGovernanceDecisionReference_Throws()
    {
        var recorder = new BufferingExecutionEventService();
        var step = new ExecutionTelemetryStep(recorder);
        var context = new ToolExecutionContext("json", "format", "{}", null)
        {
            Policy = new TestPolicy()
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            step.InvokeAsync(context, (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")), CancellationToken.None));
    }

    private static ToolExecutionContext CreateContext()
    {
        var context = new ToolExecutionContext("json", "format", "{\"name\":\"toolnexus\"}", null)
        {
            Policy = new TestPolicy()
        };

        context.Items[UniversalExecutionEngine.GovernanceDecisionIdContextKey] = Guid.NewGuid().ToString("D");
        context.Items[UniversalExecutionEngine.GovernancePolicyVersionContextKey] = "policy-v1";
        context.Items[UniversalExecutionEngine.GovernanceDecisionStatusContextKey] = GovernanceDecisionStatus.Approved.ToString();
        context.Items[UniversalExecutionEngine.GovernanceDecisionReasonContextKey] = "Allowed";
        context.Items[UniversalExecutionEngine.GovernanceApprovedByContextKey] = "server";

        return context;
    }

    private sealed class BufferingExecutionEventService : IToolExecutionEventService
    {
        public ConcurrentQueue<ToolExecutionEvent> Events { get; } = new();

        public ValueTask RecordAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
        {
            Events.Enqueue(executionEvent);
            return ValueTask.CompletedTask;
        }
    }

    private sealed class TestPolicy : Services.Policies.IToolExecutionPolicy
    {
        public string Slug => "json";
        public string ExecutionMode => "server";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 30;
        public int MaxInputSize => 10_000;
        public int MaxRequestsPerMinute => 100;
        public int CacheTtlSeconds => 0;
        public Services.Policies.ToolHttpMethodPolicy AllowedHttpMethods => Services.Policies.ToolHttpMethodPolicy.GetOrPost;
        public bool AllowAnonymous => true;
        public int MaxConcurrency => 5;
        public int RetryCount => 0;
        public int CircuitBreakerFailureThreshold => 0;
    }
}
