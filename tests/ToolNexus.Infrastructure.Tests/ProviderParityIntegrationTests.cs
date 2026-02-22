using Xunit;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Content.Entities;

namespace ToolNexus.Infrastructure.Tests;

public sealed class ProviderParityIntegrationTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task CrudParityAndSlugNormalization_WorksAcrossProviders(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        await SeedToolAsync(database, "json-formatter");

        await using var context = database.CreateContext();
        var repository = new EfToolContentRepository(context);

        var tool = await repository.GetBySlugAsync("  JSON-FORMATTER  ");

        Assert.NotNull(tool);
        Assert.Equal("json-formatter", tool!.Slug);
        Assert.Equal(new[] { "step-b", "step-a" }, tool.Features);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task OrderingBehavior_IsSortOrderDeterministicAcrossCollections(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        await SeedToolAsync(database, "ordering-check");

        await using var context = database.CreateContext();
        var repository = new EfToolContentRepository(context);

        var tool = await repository.GetBySlugAsync("ordering-check");

        Assert.NotNull(tool);
        Assert.Equal(new[] { "step-b", "step-a" }, tool!.Features);
        Assert.Equal(new[] { "Step 2", "Step 1" }, tool.Steps.Select(x => x.Title).ToArray());
        Assert.Equal(new[] { "Example 2", "Example 1" }, tool.Examples.Select(x => x.Title).ToArray());
        Assert.Equal(new[] { "Q2", "Q1" }, tool.Faq.Select(x => x.Question).ToArray());
        Assert.Equal(new[] { "tool-two", "tool-one" }, tool.RelatedTools.Select(x => x.RelatedSlug).ToArray());
        Assert.Equal(new[] { "Use case 2", "Use case 1" }, tool.UseCases);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task RelationalLoading_LoadsAllNestedCollections(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        await SeedToolAsync(database, "relations-check");

        await using var context = database.CreateContext();
        var repository = new EfToolContentRepository(context);

        var tool = await repository.GetBySlugAsync("relations-check");

        Assert.NotNull(tool);
        Assert.Equal(2, tool!.Features.Count);
        Assert.Equal(2, tool.Steps.Count);
        Assert.Equal(2, tool.Examples.Count);
        Assert.Equal(2, tool.Faq.Count);
        Assert.Equal(2, tool.RelatedTools.Count);
        Assert.Equal(2, tool.UseCases.Count);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task TransactionRollback_DoesNotPersistData(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        await using (var context = database.CreateContext())
        {
            await using var transaction = await context.Database.BeginTransactionAsync();
            context.ToolContents.Add(CreateTool("rollback-check"));
            await context.SaveChangesAsync();
            await transaction.RollbackAsync();
        }

        await using var verification = database.CreateContext();
        var found = await verification.ToolContents.AnyAsync(x => x.Slug == "rollback-check");
        Assert.False(found);
    }

    private static async Task SeedToolAsync(TestDatabaseInstance database, string slug)
    {
        await using var context = database.CreateContext();
        context.ToolContents.Add(CreateTool(slug));
        await context.SaveChangesAsync();
    }

    private static ToolContentEntity CreateTool(string slug)
    {
        return new ToolContentEntity
        {
            Slug = slug,
            Title = $"{slug} title",
            SeoTitle = $"{slug} seo",
            SeoDescription = $"{slug} desc",
            Intro = "intro",
            LongDescription = "long",
            Keywords = "key",
            Features = [new ToolFeatureEntity { Value = "step-a", SortOrder = 2 }, new ToolFeatureEntity { Value = "step-b", SortOrder = 1 }],
            Steps = [new ToolStepEntity { Title = "Step 1", Description = "d1", SortOrder = 2 }, new ToolStepEntity { Title = "Step 2", Description = "d2", SortOrder = 1 }],
            Examples = [new ToolExampleEntity { Title = "Example 1", Input = "i1", Output = "o1", SortOrder = 2 }, new ToolExampleEntity { Title = "Example 2", Input = "i2", Output = "o2", SortOrder = 1 }],
            Faq = [new ToolFaqEntity { Question = "Q1", Answer = "A1", SortOrder = 2 }, new ToolFaqEntity { Question = "Q2", Answer = "A2", SortOrder = 1 }],
            RelatedTools = [new ToolRelatedEntity { RelatedSlug = "tool-one", SortOrder = 2 }, new ToolRelatedEntity { RelatedSlug = "tool-two", SortOrder = 1 }],
            UseCases = [new ToolUseCaseEntity { Value = "Use case 1", SortOrder = 2 }, new ToolUseCaseEntity { Value = "Use case 2", SortOrder = 1 }]
        };
    }
}
