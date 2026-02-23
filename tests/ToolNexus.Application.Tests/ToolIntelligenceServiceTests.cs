using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class ToolIntelligenceServiceTests
{
    [Fact]
    public async Task DetectAndPersistDailyAnomalies_DetectsLatencySpike()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var rows = BuildBaseline(today, "json", baselineLatency: 100, baselineExecutions: 100, baselineSuccess: 95)
            .Append(new DailyToolMetricsSnapshot("json", today, 100, 95, 200));
        var repository = new StubRepository(rows.ToList());
        var service = new ToolIntelligenceService(repository);

        var anomalies = await service.DetectAndPersistDailyAnomaliesAsync(today, CancellationToken.None);

        var anomaly = Assert.Single(anomalies);
        Assert.Equal(ToolAnomalyType.LatencySpike, anomaly.Type);
    }

    [Fact]
    public async Task DetectAndPersistDailyAnomalies_DetectsFailureSpike()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var rows = BuildBaseline(today, "xml", baselineLatency: 20, baselineExecutions: 100, baselineSuccess: 98)
            .Append(new DailyToolMetricsSnapshot("xml", today, 100, 90, 20));
        var repository = new StubRepository(rows.ToList());
        var service = new ToolIntelligenceService(repository);

        var anomalies = await service.DetectAndPersistDailyAnomaliesAsync(today, CancellationToken.None);

        var anomaly = Assert.Single(anomalies);
        Assert.Equal(ToolAnomalyType.FailureSpike, anomaly.Type);
    }

    [Fact]
    public async Task DetectAndPersistDailyAnomalies_DetectsUsageDrop()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var rows = BuildBaseline(today, "yaml", baselineLatency: 20, baselineExecutions: 200, baselineSuccess: 198)
            .Append(new DailyToolMetricsSnapshot("yaml", today, 80, 79, 20));
        var repository = new StubRepository(rows.ToList());
        var service = new ToolIntelligenceService(repository);

        var anomalies = await service.DetectAndPersistDailyAnomaliesAsync(today, CancellationToken.None);

        var anomaly = Assert.Single(anomalies);
        Assert.Equal(ToolAnomalyType.UsageDrop, anomaly.Type);
    }

    [Fact]
    public async Task DetectAndPersistDailyAnomalies_ReturnsEmptyWhenStable()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var rows = BuildBaseline(today, "stable", baselineLatency: 40, baselineExecutions: 100, baselineSuccess: 95)
            .Append(new DailyToolMetricsSnapshot("stable", today, 100, 95, 40));
        var repository = new StubRepository(rows.ToList());
        var service = new ToolIntelligenceService(repository);

        var anomalies = await service.DetectAndPersistDailyAnomaliesAsync(today, CancellationToken.None);

        Assert.Empty(anomalies);
    }

    private static IEnumerable<DailyToolMetricsSnapshot> BuildBaseline(DateOnly today, string toolSlug, double baselineLatency, long baselineExecutions, long baselineSuccess)
    {
        for (var i = 1; i <= 7; i++)
        {
            yield return new DailyToolMetricsSnapshot(toolSlug, today.AddDays(-i), baselineExecutions, baselineSuccess, baselineLatency);
        }
    }

    private sealed class StubRepository(IReadOnlyList<DailyToolMetricsSnapshot> rows) : IAdminAnalyticsRepository
    {
        public IReadOnlyList<ToolAnomalySnapshot> PersistedAnomalies { get; private set; } = [];

        public Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<DailyToolMetricsSnapshot>>(rows.Where(x => x.Date >= startDateInclusive && x.Date <= endDateInclusive).ToList());

        public Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken)
        {
            PersistedAnomalies = anomalies;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<ToolAnomalySnapshot>> GetAnomaliesByDateAsync(DateOnly date, CancellationToken cancellationToken)
            => Task.FromResult(PersistedAnomalies);
    }
}
