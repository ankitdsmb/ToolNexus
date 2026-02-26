using System.Collections.Concurrent;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Application.Services.Pipeline.Steps;
using ToolNexus.Application.Services.Policies;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ZeroRegressionPipelineIntegrationTests
{
    [Fact]
    public async Task CanonicalExecutionLifecycle_EmitsStableSignalsInCanonicalOrder()
    {
        var lifecycleSignals = new List<string> { "Request" };
        var telemetryRecorder = new BufferingExecutionEventService(lifecycleSignals);

        var adapterResult = new UniversalToolExecutionResult(
            true,
            "ok",
            null,
            false,
            "json",
            "1.0.0",
            "dotnet",
            "format",
            null,
            null,
            12,
            null,
            null,
            null,
            "Succeeded",
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase),
            Array.Empty<string>());

        var engine = new UniversalExecutionEngine(
            [new LifecycleTracingAdapter(lifecycleSignals, adapterResult)],
            new NoOpLegacyStrategy(),
            new LifecycleTracingAuthorityResolver(lifecycleSignals, ExecutionAuthority.UnifiedAuthoritative),
            new LifecycleTracingConformanceValidator(lifecycleSignals, new DefaultExecutionConformanceValidator()),
            new LifecycleTracingSnapshotBuilder(lifecycleSignals, new DefaultExecutionSnapshotBuilder()),
            new AllowAllAdmissionController());

        var context = new ToolExecutionContext("json", "format", "{\"value\":42}", null)
        {
            Policy = new StablePolicy()
        };

        var request = new UniversalToolExecutionRequest(
            "json",
            "1.0.0",
            ToolRuntimeLanguage.DotNet,
            "format",
            "{\"value\":42}",
            null,
            null,
            5_000,
            null,
            null,
            ToolExecutionCapability.Standard);

        var executionResult = await engine.ExecuteAsync(request, context, CancellationToken.None);

        var telemetryStep = new ExecutionTelemetryStep(telemetryRecorder);
        var response = await telemetryStep.InvokeAsync(
            context,
            (_, _) => Task.FromResult(executionResult.ToToolExecutionResponse()),
            CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(
            ["Request", "Authority", "Snapshot", "Execution", "Conformance", "Telemetry"],
            lifecycleSignals);

        Assert.Equal(ExecutionAuthority.UnifiedAuthoritative.ToString(), context.Items[UniversalExecutionEngine.ExecutionAuthorityContextKey]);
        Assert.Equal(ExecutionAuthority.UnifiedAuthoritative.ToString(), context.Items[UniversalExecutionEngine.SnapshotAuthorityContextKey]);

        Assert.True(context.Items.ContainsKey(UniversalExecutionEngine.ExecutionSnapshotContextKey));
        Assert.True(Guid.TryParse(context.Items[UniversalExecutionEngine.ExecutionSnapshotIdContextKey]?.ToString(), out _));

        Assert.Equal("true", context.Items[UniversalExecutionEngine.ConformanceValidContextKey]);
        Assert.Equal("false", context.Items[UniversalExecutionEngine.ConformanceNormalizedContextKey]);
        Assert.Equal("0", context.Items[UniversalExecutionEngine.ConformanceIssueCountContextKey]);

        var telemetryEvent = Assert.Single(telemetryRecorder.Events);
        Assert.Equal(ExecutionAuthority.UnifiedAuthoritative.ToString(), telemetryEvent.ExecutionAuthority);
        Assert.Equal("dotnet", telemetryEvent.RuntimeLanguage);
        Assert.Equal(ToolExecutionCapability.Standard.Value, telemetryEvent.Capability);
        Assert.False(string.IsNullOrWhiteSpace(telemetryEvent.ExecutionSnapshotId));
        Assert.Equal("true", telemetryEvent.ConformanceValid);
        Assert.Equal("false", telemetryEvent.ConformanceNormalized);
        Assert.Equal(0, telemetryEvent.ConformanceIssueCount);
        Assert.False(string.IsNullOrWhiteSpace(telemetryEvent.AdapterName));
        Assert.Equal("resolved", telemetryEvent.AdapterResolutionStatus);
    }

    private sealed class LifecycleTracingAuthorityResolver(List<string> lifecycleSignals, ExecutionAuthority authority) : IExecutionAuthorityResolver
    {
        public ExecutionAuthority ResolveAuthority(ToolExecutionContext context, UniversalToolExecutionRequest request)
        {
            lifecycleSignals.Add("Authority");
            return authority;
        }
    }

    private sealed class LifecycleTracingSnapshotBuilder(List<string> lifecycleSignals, IExecutionSnapshotBuilder inner) : IExecutionSnapshotBuilder
    {
        public ExecutionSnapshot BuildSnapshot(UniversalToolExecutionRequest request, ToolExecutionContext context, ExecutionAuthority authority)
        {
            lifecycleSignals.Add("Snapshot");
            return inner.BuildSnapshot(request, context, authority);
        }
    }

    private sealed class LifecycleTracingAdapter(List<string> lifecycleSignals, UniversalToolExecutionResult result) : ILanguageExecutionAdapter
    {
        public ToolRuntimeLanguage Language => ToolRuntimeLanguage.DotNet;

        public Task<UniversalToolExecutionResult> ExecuteAsync(UniversalToolExecutionRequest request, ToolExecutionContext context, CancellationToken cancellationToken)
        {
            lifecycleSignals.Add("Execution");
            return Task.FromResult(result);
        }
    }

    private sealed class LifecycleTracingConformanceValidator(List<string> lifecycleSignals, IExecutionConformanceValidator inner) : IExecutionConformanceValidator
    {
        public ExecutionConformanceResult Validate(UniversalToolExecutionResult result, UniversalToolExecutionRequest request)
        {
            lifecycleSignals.Add("Conformance");
            return inner.Validate(result, request);
        }
    }

    private sealed class BufferingExecutionEventService(List<string> lifecycleSignals) : IToolExecutionEventService
    {
        public ConcurrentQueue<ToolExecutionEvent> Events { get; } = new();

        public ValueTask RecordAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
        {
            lifecycleSignals.Add("Telemetry");
            Events.Enqueue(executionEvent);
            return ValueTask.CompletedTask;
        }
    }

    private sealed class AllowAllAdmissionController : IExecutionAdmissionController
    {
        public ExecutionAdmissionDecision Evaluate(ExecutionSnapshot snapshot, ToolExecutionContext context)
            => new(true, "Allowed", nameof(AllowAllAdmissionController), new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase));
    }

    private sealed class NoOpLegacyStrategy : IApiToolExecutionStrategy
    {
        public Task<ToolExecutionResponse> ExecuteAsync(string toolId, string action, string input, IToolExecutionPolicy? policy, CancellationToken cancellationToken = default)
            => Task.FromResult(new ToolExecutionResponse(true, "unused"));
    }

    private sealed class StablePolicy : IToolExecutionPolicy
    {
        public string Slug => "json";
        public string ExecutionMode => "server";
        public bool IsExecutionEnabled => true;
        public int TimeoutSeconds => 30;
        public int MaxInputSize => 4096;
        public int MaxRequestsPerMinute => 60;
        public int CacheTtlSeconds => 0;
        public ToolHttpMethodPolicy AllowedHttpMethods => ToolHttpMethodPolicy.GetOrPost;
        public bool AllowAnonymous => true;
        public int MaxConcurrency => 4;
        public int RetryCount => 0;
        public int CircuitBreakerFailureThreshold => 5;
    }
}
