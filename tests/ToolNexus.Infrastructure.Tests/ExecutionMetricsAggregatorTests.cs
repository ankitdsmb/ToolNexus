using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Observability;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class ExecutionMetricsAggregatorTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task FirstExecution_CreatesMetricsRow(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        var aggregator = new ExecutionMetricsAggregator();

        await using var context = db.CreateContext();
        await aggregator.UpdateAsync(context, CreateEvent(durationMs: 30, success: true, payloadSize: 20), CancellationToken.None);
        await context.SaveChangesAsync();

        var metrics = context.DailyToolMetrics.Single();
        Assert.Equal("json-pretty", metrics.ToolSlug);
        Assert.Equal(1, metrics.TotalExecutions);
        Assert.Equal(1, metrics.SuccessCount);
        Assert.Equal(0, metrics.FailureCount);
        Assert.Equal(30d, metrics.AvgDurationMs);
        Assert.Equal(30, metrics.MaxDurationMs);
        Assert.Equal(20, metrics.TotalPayloadSize);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task RepeatedExecutions_UpdateCountsAndAverage(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        var aggregator = new ExecutionMetricsAggregator();

        await using (var context = db.CreateContext())
        {
            await aggregator.UpdateAsync(context, CreateEvent(durationMs: 20, success: true, payloadSize: 10), CancellationToken.None);
            await context.SaveChangesAsync();
        }

        await using (var context = db.CreateContext())
        {
            await aggregator.UpdateAsync(context, CreateEvent(durationMs: 40, success: false, payloadSize: 15), CancellationToken.None);
            await context.SaveChangesAsync();
        }

        await using var verify = db.CreateContext();
        var metrics = verify.DailyToolMetrics.Single();

        Assert.Equal(2, metrics.TotalExecutions);
        Assert.Equal(1, metrics.SuccessCount);
        Assert.Equal(1, metrics.FailureCount);
        Assert.Equal(30d, metrics.AvgDurationMs);
        Assert.Equal(40, metrics.MaxDurationMs);
        Assert.Equal(25, metrics.TotalPayloadSize);
    }

    private static ToolExecutionEvent CreateEvent(long durationMs, bool success, int payloadSize)
    {
        return new ToolExecutionEvent
        {
            ToolSlug = "json-pretty",
            TimestampUtc = new DateTime(2026, 2, 23, 15, 30, 0, DateTimeKind.Utc),
            DurationMs = durationMs,
            Success = success,
            PayloadSize = payloadSize,
            ExecutionMode = "server"
        };
    }
}
