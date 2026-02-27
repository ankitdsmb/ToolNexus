using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Options;
using Xunit;

namespace ToolNexus.Infrastructure.Tests.Startup;

public sealed class DatabaseInitializationHostedServiceTests
{
    [Fact]
    public async Task ExecuteAsync_InvalidMigrationProvider_FailsDeterministically()
    {
        var services = new ServiceCollection();
        services.AddDbContext<ToolNexusContentDbContext>(options => options.UseSqlite($"Data Source=:memory:"));
        services.AddDbContext<ToolNexusIdentityDbContext>(options => options.UseSqlite($"Data Source=:memory:"));
        using var provider = services.BuildServiceProvider();

        var state = new DatabaseInitializationState();
        var service = new DatabaseInitializationHostedService(
            provider,
            Microsoft.Extensions.Options.Options.Create(new DatabaseInitializationOptions { RunMigrationOnStartup = true }),
            state,
            NullLogger<DatabaseInitializationHostedService>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.ExecuteAsync(CancellationToken.None));

        Assert.True(state.HasFailed);
        Assert.Contains("Relational-specific", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Relational-specific", state.Error ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void IsTransientPostgresStartupException_RetriesOnlyReadinessFailures()
    {
        var method = typeof(DatabaseInitializationHostedService)
            .GetMethod("IsTransientPostgresStartupException", BindingFlags.NonPublic | BindingFlags.Static);

        Assert.NotNull(method);

        var timeoutResult = (bool)method!.Invoke(null, [new TimeoutException("db not ready")])!;
        var structuralResult = (bool)method.Invoke(null, [new InvalidOperationException("structural")])!;

        Assert.True(timeoutResult);
        Assert.False(structuralResult);
    }

    [Fact]
    public async Task EnsureOptimizationLedgerSchemaAsync_NonPostgresProvider_NoOp()
    {
        var services = new ServiceCollection();
        services.AddDbContext<ToolNexusContentDbContext>(options => options.UseSqlite("Data Source=:memory:"));
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();

        var method = typeof(DatabaseInitializationHostedService)
            .GetMethod("EnsureOptimizationLedgerSchemaAsync", BindingFlags.NonPublic | BindingFlags.Static);

        Assert.NotNull(method);

        var task = (Task?)method!.Invoke(null, [dbContext, CancellationToken.None]);
        Assert.NotNull(task);
        await task!;
    }
}
