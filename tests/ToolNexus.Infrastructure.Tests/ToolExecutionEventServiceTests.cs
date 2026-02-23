using System.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Observability;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class ToolExecutionEventServiceTests
{
    [Fact]
    public async Task Queue_AcceptsAndDequeuesWorkItems()
    {
        var queue = new BackgroundWorkQueue(new BackgroundWorkerHealthState());
        var processed = false;

        await queue.QueueAsync(_ =>
        {
            processed = true;
            return ValueTask.CompletedTask;
        }, CancellationToken.None);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(1));
        await foreach (var workItem in queue.DequeueAllAsync(cts.Token))
        {
            await workItem(cts.Token);
            break;
        }

        Assert.True(processed);
    }

    [Fact]
    public async Task BackgroundWorker_ProcessesQueuedEvents()
    {
        var state = new BackgroundWorkerHealthState();
        var queue = new BackgroundWorkQueue(state);
        var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var worker = new TelemetryBackgroundWorker(queue, state, new InMemoryWorkerLock(), NullLogger<TelemetryBackgroundWorker>.Instance);
        var sut = new ToolExecutionEventService(queue, new DelegateTelemetryProcessor((_, _) =>
        {
            tcs.TrySetResult(true);
            return ValueTask.CompletedTask;
        }));

        await worker.StartAsync(CancellationToken.None);
        await sut.RecordAsync(BuildEvent(), CancellationToken.None);

        var completed = await Task.WhenAny(tcs.Task, Task.Delay(1000));
        await worker.StopAsync(CancellationToken.None);

        Assert.Same(tcs.Task, completed);
        Assert.True(await tcs.Task);
        Assert.NotNull(state.LastProcessedUtc);
    }

    [Fact]
    public async Task RecordAsync_DoesNotBlockRequestPath_WhenProcessingIsSlow()
    {
        var state = new BackgroundWorkerHealthState();
        var queue = new BackgroundWorkQueue(state);
        var finished = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var worker = new TelemetryBackgroundWorker(queue, state, new InMemoryWorkerLock(), NullLogger<TelemetryBackgroundWorker>.Instance);
        var sut = new ToolExecutionEventService(queue, new DelegateTelemetryProcessor(async (_, token) =>
        {
            await Task.Delay(250, token);
            finished.TrySetResult(true);
        }));

        await worker.StartAsync(CancellationToken.None);

        var stopwatch = Stopwatch.StartNew();
        await sut.RecordAsync(BuildEvent(), CancellationToken.None);
        stopwatch.Stop();

        var completed = await Task.WhenAny(finished.Task, Task.Delay(1000));
        await worker.StopAsync(CancellationToken.None);

        Assert.True(stopwatch.ElapsedMilliseconds < 50, $"RecordAsync took {stopwatch.ElapsedMilliseconds}ms.");
        Assert.Same(finished.Task, completed);
    }

    [Fact]
    public async Task BackgroundWorker_ContinuesAfterException_AndRetriesOnce()
    {
        var state = new BackgroundWorkerHealthState();
        var queue = new BackgroundWorkQueue(state);
        var processedSecond = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var invocation = 0;
        var worker = new TelemetryBackgroundWorker(queue, state, new InMemoryWorkerLock(), NullLogger<TelemetryBackgroundWorker>.Instance);

        await worker.StartAsync(CancellationToken.None);

        await queue.QueueAsync(_ =>
        {
            invocation++;
            throw new InvalidOperationException("boom");
        }, CancellationToken.None);

        await queue.QueueAsync(_ =>
        {
            invocation++;
            processedSecond.TrySetResult(true);
            return ValueTask.CompletedTask;
        }, CancellationToken.None);

        var completed = await Task.WhenAny(processedSecond.Task, Task.Delay(1000));
        await worker.StopAsync(CancellationToken.None);

        Assert.True(processedSecond.Task.IsCompletedSuccessfully);
        Assert.Equal(3, invocation);
    }

    private static ToolExecutionEvent BuildEvent() => new()
    {
        ToolSlug = "json",
        TimestampUtc = DateTime.UtcNow,
        DurationMs = 10,
        Success = true,
        PayloadSize = 42,
        ExecutionMode = "server"
    };

    private sealed class DelegateTelemetryProcessor(Func<ToolExecutionEvent, CancellationToken, ValueTask> process)
        : ITelemetryEventProcessor
    {
        public ValueTask ProcessAsync(ToolExecutionEvent executionEvent, CancellationToken cancellationToken)
            => process(executionEvent, cancellationToken);
    }
}
