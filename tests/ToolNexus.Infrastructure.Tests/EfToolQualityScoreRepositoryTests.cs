using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using Xunit;
using Xunit.Sdk;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfToolQualityScoreRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task AddAndReadLatestScore_Persists(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        await using var context = database.CreateContext();
        var repository = new EfToolQualityScoreRepository(context);

        var older = new ToolQualityScoreRecord("json", 82m, 80m, 84m, 81m, DateTime.UtcNow.AddMinutes(-5));
        var latest = new ToolQualityScoreRecord("json", 88m, 87m, 90m, 86m, DateTime.UtcNow);

        await repository.AddAsync(older, CancellationToken.None);
        await repository.AddAsync(latest, CancellationToken.None);

        var persistedLatest = await repository.GetLatestByToolIdAsync("json", CancellationToken.None);

        Assert.NotNull(persistedLatest);
        Assert.Equal(88m, persistedLatest!.Score);

        var rows = await context.ToolQualityScores.AsNoTracking().CountAsync();
        Assert.Equal(2, rows);
    }

    [Fact]
    public async Task PostgreSql_ToolQualityScoreTable_Persists()
    {
        TestDatabaseInstance database;
        try
        {
            database = await TestDatabaseInstance.CreateAsync(TestDatabaseProvider.PostgreSql);
        }
        catch (Exception ex) when (ex is InvalidOperationException or SkipException)
        {
            return;
        }

        await using var _ = database;
        await using var context = database.CreateContext();
        var repository = new EfToolQualityScoreRepository(context);

        await repository.AddAsync(new ToolQualityScoreRecord("json-validator", 71m, 70m, 72m, 71m, DateTime.UtcNow), CancellationToken.None);

        var exists = await context.ToolQualityScores.AsNoTracking().AnyAsync(x => x.ToolId == "json-validator");
        Assert.True(exists);
    }
}
