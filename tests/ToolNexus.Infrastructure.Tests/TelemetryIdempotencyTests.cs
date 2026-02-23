using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Observability;
using ToolNexus.Infrastructure.Data;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class TelemetryIdempotencyTests
{
    [Fact]
    public async Task DuplicateEvent_IsIgnored_ForAggregation()
    {
        var sqlitePath = Path.Combine(Path.GetTempPath(), $"toolnexus-idempotency-{Guid.NewGuid():N}.db");
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

        var telemetryEvent = new ToolExecutionEvent
        {
            ToolSlug = "json",
            TimestampUtc = DateTime.UtcNow,
            DurationMs = 11,
            Success = true,
            PayloadSize = 16,
            ExecutionMode = "Local"
        };

        await processor.ProcessAsync(telemetryEvent, CancellationToken.None);
        await processor.ProcessAsync(telemetryEvent, CancellationToken.None);

        await using var verifyScope = provider.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();

        Assert.Equal(1, await verifyDb.ToolExecutionEvents.CountAsync());
        var daily = await verifyDb.DailyToolMetrics.SingleAsync();
        Assert.Equal(1, daily.TotalExecutions);

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
