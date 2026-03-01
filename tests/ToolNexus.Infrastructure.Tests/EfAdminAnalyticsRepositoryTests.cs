using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Data;
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

        var initializationState = new DatabaseInitializationState();
        initializationState.MarkReady();
        var repository = new EfAdminAnalyticsRepository(new DelegatingDbContextFactory(db.CreateContext), initializationState);

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

    private sealed class DelegatingDbContextFactory(Func<ToolNexusContentDbContext> createContext)
        : IDbContextFactory<ToolNexusContentDbContext>
    {
        public ToolNexusContentDbContext CreateDbContext() => createContext();

        public Task<ToolNexusContentDbContext> CreateDbContextAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(createContext());
    }
}
