using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfArchitectureEvolutionRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task AddSignalAndRecommendation_Persists(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        await using var context = database.CreateContext();
        var repository = new EfArchitectureEvolutionRepository(context);

        var signal = new ArchitectureEvolutionSignal(Guid.NewGuid(), "adapter.complexity", "execution-layer", 0.8m, "corr-1", "tenant-1", "dotnet", DateTime.UtcNow, "{}");
        await repository.AddSignalAsync(signal, CancellationToken.None);

        var recommendation = new EvolutionRecommendation(Guid.NewGuid(), "execution-layer", "moderate", "medium", 0.8m, 120m, 150m, "phased", "phase1", "rollback", "corr-1", "tenant-1", DateTime.UtcNow, "pending-review");
        await repository.AddRecommendationAsync(recommendation, CancellationToken.None);

        var signalExists = await context.ArchitectureEvolutionSignals.AsNoTracking().AnyAsync(x => x.SignalId == signal.SignalId);
        var recommendationExists = await context.EvolutionRecommendations.AsNoTracking().AnyAsync(x => x.RecommendationId == recommendation.RecommendationId);

        Assert.True(signalExists);
        Assert.True(recommendationExists);
    }
}
