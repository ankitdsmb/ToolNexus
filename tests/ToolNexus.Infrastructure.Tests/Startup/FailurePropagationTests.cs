using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Observability;
using Xunit;

namespace ToolNexus.Infrastructure.Tests.Startup;

public sealed class FailurePropagationTests
{
    [Fact]
    public async Task MissingGovernanceDecisionId_FailsAtPersistenceBoundary()
    {
        var sqlitePath = Path.Combine(Path.GetTempPath(), $"toolnexus-failure-prop-{Guid.NewGuid():N}.db");
        var services = new ServiceCollection();
        services.AddDbContext<ToolNexusContentDbContext>(options => options.UseSqlite($"Data Source={sqlitePath}"));
        services.AddSingleton<ExecutionMetricsAggregator>();
        services.AddScoped<IToolIntelligenceService, NoOpToolIntelligenceService>();

        await using (var bootstrap = services.BuildServiceProvider().CreateAsyncScope())
        {
            var db = bootstrap.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
            await db.Database.EnsureCreatedAsync();
        }

        var provider = services.BuildServiceProvider();
        var processor = new TelemetryEventProcessor(
            provider.GetRequiredService<IServiceScopeFactory>(),
            provider.GetRequiredService<ExecutionMetricsAggregator>(),
            NullLogger<TelemetryEventProcessor>.Instance);

        var telemetryEvent = new ToolExecutionEvent { ToolSlug = "json", TimestampUtc = DateTime.UtcNow, GovernanceDecisionId = Guid.Empty };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => processor.ProcessAsync(telemetryEvent, CancellationToken.None).AsTask());
        Assert.Contains("missing required governance decision reference", ex.Message, StringComparison.OrdinalIgnoreCase);

        if (File.Exists(sqlitePath))
        {
            File.Delete(sqlitePath);
        }
    }

    private sealed class NoOpToolIntelligenceService : IToolIntelligenceService
    {
        public Task<IReadOnlyList<ToolAnomalySnapshot>> DetectAndPersistDailyAnomaliesAsync(DateOnly date, CancellationToken cancellationToken)
            => Task.FromResult<IReadOnlyList<ToolAnomalySnapshot>>([]);
    }
}
