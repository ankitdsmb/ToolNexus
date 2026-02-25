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

        await step.InvokeAsync(
            context,
            (_, _) => Task.FromResult(new ToolExecutionResponse(true, "ok")),
            CancellationToken.None);

        var evt = Assert.Single(recorder.Events);
        Assert.Equal("dotnet", evt.Language);
        Assert.Equal("DotNetExecutionAdapter", evt.AdapterName);
        Assert.Equal("resolved", evt.AdapterResolutionStatus);
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

    private static ToolExecutionContext CreateContext()
    {
        return new ToolExecutionContext("json", "format", "{\"name\":\"toolnexus\"}", null)
        {
            Policy = new TestPolicy()
        };
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
