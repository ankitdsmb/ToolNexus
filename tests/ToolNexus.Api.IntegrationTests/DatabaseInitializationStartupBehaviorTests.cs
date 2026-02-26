using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class DatabaseInitializationStartupBehaviorTests
{
    [Fact]
    public async Task HostStartup_FailsFast_WhenDatabaseIsUnavailable()
    {
        await using var factory = new UnavailableDatabaseFactory();

        var startupTimer = Stopwatch.StartNew();
        var ex = await Assert.ThrowsAnyAsync<Exception>(() => Task.FromResult(factory.CreateClient()));
        startupTimer.Stop();

        Assert.Contains("Database initialization failed", ex.ToString(), StringComparison.OrdinalIgnoreCase);
        Assert.True(startupTimer.Elapsed < TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task HostStartup_WithInvalidConnection_StopsDeterministically()
    {
        await using var factory = new UnavailableDatabaseFactory();

        var ex = await Assert.ThrowsAnyAsync<Exception>(() => Task.FromResult(factory.CreateClient()));
        Assert.Contains("Database initialization failed", ex.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private sealed record BackgroundHealthPayload(DatabaseInitializationPayload DatabaseInitialization);

    private sealed record DatabaseInitializationPayload(string Status, string? Error);

    private sealed class UnavailableDatabaseFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                var settings = new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Redis"] = string.Empty,
                    ["OpenTelemetry:Enabled"] = "false",
                    ["Database:Provider"] = "Postgres",
                    ["Database:ConnectionString"] = "Host=127.0.0.1;Port=59999;Database=toolnexus;Username=bad;Password=bad;SSL Mode=Disable;Timeout=1;Command Timeout=1",
                    ["Database:RunMigrationOnStartup"] = "true",
                    ["Database:RunSeedOnStartup"] = "false"
                };

                configBuilder.AddInMemoryCollection(settings);
            });
        }
    }
}
