using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class AdminAnalyticsServiceTests
{
    [Fact]
    public async Task GetDashboard_SummaryMetrics_AreCalculatedFromTodayRows()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var service = new AdminAnalyticsService(new StubRepository([
            new DailyToolMetricsSnapshot("json", today, 100, 90, 50),
            new DailyToolMetricsSnapshot("xml", today, 50, 40, 30),
            new DailyToolMetricsSnapshot("yaml", today.AddDays(-1), 1000, 1000, 1)
        ]));

        var dashboard = await service.GetDashboardAsync(CancellationToken.None);

        Assert.Equal(150, dashboard.TotalExecutionsToday);
        Assert.Equal(86.66666666666667, dashboard.SuccessRate, 6);
        Assert.Equal(43.333333333333336, dashboard.AvgDurationMs, 6);
        Assert.Equal(2, dashboard.ActiveToolsCount);
    }

    [Fact]
    public async Task GetDashboard_TopTools_AreSortedByExecutionsDescending()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var service = new AdminAnalyticsService(new StubRepository([
            new DailyToolMetricsSnapshot("tool-b", today, 50, 40, 10),
            new DailyToolMetricsSnapshot("tool-a", today, 50, 40, 20),
            new DailyToolMetricsSnapshot("tool-c", today, 80, 70, 5)
        ]));

        var dashboard = await service.GetDashboardAsync(CancellationToken.None);

        Assert.Collection(dashboard.TopTools,
            first => Assert.Equal("tool-c", first.ToolSlug),
            second => Assert.Equal("tool-a", second.ToolSlug),
            third => Assert.Equal("tool-b", third.ToolSlug));
    }

    [Fact]
    public async Task GetDashboard_SlowTools_AreCalculatedByAverageDuration()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var service = new AdminAnalyticsService(new StubRepository([
            new DailyToolMetricsSnapshot("fast", today, 200, 195, 10),
            new DailyToolMetricsSnapshot("slow", today, 20, 16, 300),
            new DailyToolMetricsSnapshot("medium", today, 40, 35, 120)
        ]));

        var dashboard = await service.GetDashboardAsync(CancellationToken.None);

        Assert.Collection(dashboard.SlowTools,
            first => Assert.Equal("slow", first.ToolSlug),
            second => Assert.Equal("medium", second.ToolSlug),
            third => Assert.Equal("fast", third.ToolSlug));
    }

    [Fact]
    public async Task GetDashboard_Trend_IsOrderedByDateAscending()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var service = new AdminAnalyticsService(new StubRepository([
            new DailyToolMetricsSnapshot("tool", today.AddDays(-1), 10, 10, 10),
            new DailyToolMetricsSnapshot("tool", today.AddDays(-3), 10, 10, 10),
            new DailyToolMetricsSnapshot("tool", today.AddDays(-2), 10, 10, 10)
        ]));

        var dashboard = await service.GetDashboardAsync(CancellationToken.None);

        var dates = dashboard.ExecutionTrend.Select(x => x.Date).ToArray();
        Assert.True(dates.SequenceEqual(dates.OrderBy(x => x)));
    }

    private sealed class StubRepository(IReadOnlyList<DailyToolMetricsSnapshot> rows) : IAdminAnalyticsRepository
    {
        public Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<DailyToolMetricsSnapshot>>(rows
                .Where(x => x.Date >= startDateInclusive && x.Date <= endDateInclusive)
                .ToList());

        public Task<(IReadOnlyList<DailyToolMetricsSnapshot> Items, int TotalItems)> QueryAsync(AdminAnalyticsQuery query, CancellationToken cancellationToken)
        {
            var filtered = rows
                .Where(x => x.Date >= query.StartDate && x.Date <= query.EndDate)
                .Where(x => string.IsNullOrWhiteSpace(query.ToolSlug) || x.ToolSlug == query.ToolSlug)
                .OrderByDescending(x => x.Date)
                .ThenBy(x => x.ToolSlug)
                .ToList();

            var pageItems = filtered.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToList();
            return Task.FromResult<(IReadOnlyList<DailyToolMetricsSnapshot>, int)>((pageItems, filtered.Count));
        }

        public Task ReplaceAnomaliesForDateAsync(DateOnly date, IReadOnlyList<ToolNexus.Application.Models.ToolAnomalySnapshot> anomalies, CancellationToken cancellationToken)
            => Task.CompletedTask;

        public Task<IReadOnlyList<ToolNexus.Application.Models.ToolAnomalySnapshot>> GetAnomaliesByDateAsync(DateOnly date, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<ToolNexus.Application.Models.ToolAnomalySnapshot>>([]);
    }

}
