using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfAdminAnalyticsRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task MissingAnalyticsTables_ReturnsSafeDefaults(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        await using (var context = db.CreateContext())
        {
            await context.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS ToolAnomalySnapshots;");
            await context.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS DailyToolMetrics;");
        }

        await using var verifyContext = db.CreateContext();
        var repository = new EfAdminAnalyticsRepository(verifyContext);

        var from = new DateOnly(2026, 1, 1);
        var to = new DateOnly(2026, 1, 31);

        var byRange = await repository.GetByDateRangeAsync(from, to, CancellationToken.None);
        var query = await repository.QueryAsync(new AdminAnalyticsQuery(from, to, null, 1, 25), CancellationToken.None);
        var anomalies = await repository.GetAnomaliesByDateAsync(from, CancellationToken.None);
        await repository.ReplaceAnomaliesForDateAsync(from, [], CancellationToken.None);

        Assert.Empty(byRange);
        Assert.Empty(query.Items);
        Assert.Equal(0, query.TotalItems);
        Assert.Empty(anomalies);
    }
}
