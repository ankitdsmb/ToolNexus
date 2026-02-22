using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Observability;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class ToolExecutionEventServiceTests
{
    [Fact]
    public async Task RecordAsync_PersistsExecutionEvent()
    {
        await using var db = await TestDatabaseInstance.CreateAsync(TestDatabaseProvider.Sqlite);

        var services = new ServiceCollection();
        services.AddScoped(_ => db.CreateContext());
        services.AddSingleton<Microsoft.Extensions.Logging.ILogger<ToolExecutionEventService>>(NullLogger<ToolExecutionEventService>.Instance);
        services.AddSingleton<ToolExecutionEventService>();

        var provider = services.BuildServiceProvider();
        var sut = provider.GetRequiredService<ToolExecutionEventService>();
        await sut.StartAsync(CancellationToken.None);

        await sut.RecordAsync(new ToolExecutionEvent
        {
            ToolSlug = "json",
            TimestampUtc = DateTime.UtcNow,
            DurationMs = 25,
            Success = true,
            PayloadSize = 12,
            ExecutionMode = "server"
        }, CancellationToken.None);

        var persisted = await WaitForEventAsync(db, CancellationToken.None);

        await sut.StopAsync(CancellationToken.None);

        Assert.NotNull(persisted);
        Assert.Equal("json", persisted!.ToolSlug);
    }

    private static async Task<ToolNexus.Infrastructure.Content.Entities.ToolExecutionEventEntity?> WaitForEventAsync(TestDatabaseInstance db, CancellationToken cancellationToken)
    {
        for (var i = 0; i < 20; i++)
        {
            await Task.Delay(25, cancellationToken);
            await using var context = db.CreateContext();
            var evt = context.ToolExecutionEvents.OrderByDescending(x => x.Id).FirstOrDefault();
            if (evt is not null)
            {
                return evt;
            }
        }

        return null;
    }
}
