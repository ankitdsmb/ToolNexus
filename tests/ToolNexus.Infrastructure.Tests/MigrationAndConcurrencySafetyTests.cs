using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Content.Entities;

namespace ToolNexus.Infrastructure.Tests;

public sealed class MigrationAndConcurrencySafetyTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task MigrationExecution_OnEmptyDatabase_CreatesSchema(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        await using var context = database.CreateContext();
        var canQuery = await context.ToolContents.CountAsync();

        Assert.Equal(0, canQuery);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task MigrationRerun_IsIdempotent(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        await using var context = database.CreateContext();
        await context.Database.MigrateAsync();
        await context.Database.MigrateAsync();

        var pending = await context.Database.GetPendingMigrationsAsync();
        Assert.Empty(pending);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task StartupMigrationFlow_SeedsOnlyOnce(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        var services = new ServiceCollection();
        services.AddSingleton<IToolManifestRepository>(new FakeManifestRepository());
        services.AddScoped(_ => database.CreateContext());

        await using var providerRoot = services.BuildServiceProvider();
        var hostedService = new ToolContentSeedHostedService(
            providerRoot,
            providerRoot.GetRequiredService<IToolManifestRepository>(),
            NullLogger<ToolContentSeedHostedService>.Instance);

        await hostedService.StartAsync(CancellationToken.None);
        await hostedService.StartAsync(CancellationToken.None);

        await using var context = database.CreateContext();
        Assert.Equal(1, await context.ToolContents.CountAsync());
        Assert.Equal(1, await context.ToolCategories.CountAsync());
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task StartupMigrationFlow_FromUnmigratedDatabase_AppliesMigrations(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateUnmigratedAsync(provider);

        var services = new ServiceCollection();
        services.AddSingleton<IToolManifestRepository>(new FakeManifestRepository());
        services.AddScoped(_ => database.CreateContext());

        await using var providerRoot = services.BuildServiceProvider();
        var hostedService = new ToolContentSeedHostedService(
            providerRoot,
            providerRoot.GetRequiredService<IToolManifestRepository>(),
            NullLogger<ToolContentSeedHostedService>.Instance);

        await hostedService.StartAsync(CancellationToken.None);

        await using var context = database.CreateContext();
        Assert.Equal(1, await context.ToolContents.CountAsync());
        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task UniqueConstraint_DuplicateSlugThrows(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        await using var context = database.CreateContext();
        context.ToolContents.Add(CreateBasicTool("dup-slug"));
        context.ToolContents.Add(CreateBasicTool("dup-slug"));

        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [Fact]
    public async Task StartupMigrationFlow_LegacySqliteWithoutMigrationHistory_DoesNotCrash()
    {
        await using var database = await TestDatabaseInstance.CreateLegacySqliteSchemaAsync();

        var services = new ServiceCollection();
        services.AddSingleton<IToolManifestRepository>(new FakeManifestRepository());
        services.AddScoped(_ => database.CreateContext());

        await using var providerRoot = services.BuildServiceProvider();
        var hostedService = new ToolContentSeedHostedService(
            providerRoot,
            providerRoot.GetRequiredService<IToolManifestRepository>(),
            NullLogger<ToolContentSeedHostedService>.Instance);

        await hostedService.StartAsync(CancellationToken.None);

        await using var context = database.CreateContext();
        Assert.Equal(1, await context.ToolContents.CountAsync());
        var applied = await context.Database.GetAppliedMigrationsAsync();
        Assert.Empty(applied);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task ConcurrentInserts_PreserveIdentitySequenceAndPreventDuplicates(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        var inserts = Enumerable.Range(0, 8).Select(async index =>
        {
            await using var context = database.CreateContext();
            context.ToolContents.Add(CreateBasicTool($"slug-{index}"));
            await context.SaveChangesAsync();
        });

        await Task.WhenAll(inserts);

        await using var verification = database.CreateContext();
        var ids = await verification.ToolContents.OrderBy(x => x.Id).Select(x => x.Id).ToListAsync();

        Assert.Equal(8, ids.Count);
        Assert.Equal(ids.Distinct().Count(), ids.Count);

        var duplicateTasks = Enumerable.Range(0, 2).Select(async _ =>
        {
            await using var context = database.CreateContext();
            context.ToolContents.Add(CreateBasicTool("slug-duplicate"));
            await context.SaveChangesAsync();
        }).ToArray();

        var duplicateFailures = 0;
        foreach (var duplicateTask in duplicateTasks)
        {
            try
            {
                await duplicateTask;
            }
            catch (DbUpdateException)
            {
                duplicateFailures++;
            }
        }

        Assert.Equal(1, duplicateFailures);
    }

    private static ToolContentEntity CreateBasicTool(string slug)
    {
        return new ToolContentEntity
        {
            Slug = slug,
            Title = slug,
            SeoTitle = slug,
            SeoDescription = slug,
            Intro = slug,
            LongDescription = slug,
            Keywords = slug
        };
    }

    private sealed class FakeManifestRepository : IToolManifestRepository
    {
        public IReadOnlyCollection<ToolDescriptor> LoadTools()
        {
            return
            [
                new ToolDescriptor
                {
                    Slug = "seeded-tool",
                    Title = "Seeded Tool",
                    Category = "Utilities",
                    SeoTitle = "Seeded Tool",
                    SeoDescription = "Seeded tool description",
                    ExampleInput = "{}",
                    Actions = ["format"]
                }
            ];
        }
    }
}
