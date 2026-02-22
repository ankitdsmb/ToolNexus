using Microsoft.Extensions.Caching.Memory;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Content.Entities;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class ExecutionPolicyRepositoryTests
{
    [Fact]
    public async Task Update_IsReflected_WithoutRestart()
    {
        await using var database = await TestDatabaseInstance.CreateAsync(TestDatabaseProvider.Sqlite);
        await using var context = database.CreateContext();
        context.ToolDefinitions.Add(new ToolDefinitionEntity
        {
            Name = "Json",
            Slug = "json",
            Description = "d",
            Category = "c",
            Status = "Enabled",
            Icon = "i",
            SortOrder = 1,
            ActionsCsv = "format",
            InputSchema = "{}",
            OutputSchema = "{}",
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await context.SaveChangesAsync();

        var cache = new MemoryCache(new MemoryCacheOptions());
        var repository = new EfExecutionPolicyRepository(context, cache);

        var initial = await repository.GetBySlugAsync("json");
        Assert.NotNull(initial);
        Assert.Equal("Local", initial.ExecutionMode);

        var updated = await repository.UpsertBySlugAsync("json", new UpdateToolExecutionPolicyRequest("Sandbox", 45, 33, 2048, true));
        Assert.NotNull(updated);
        Assert.Equal("Sandbox", updated.ExecutionMode);

        var readAgain = await repository.GetBySlugAsync("json");
        Assert.NotNull(readAgain);
        Assert.Equal(45, readAgain.TimeoutSeconds);
        Assert.Equal(2048, readAgain.MaxInputSize);
    }
}
