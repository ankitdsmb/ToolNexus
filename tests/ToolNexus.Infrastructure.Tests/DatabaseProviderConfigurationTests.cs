using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Infrastructure;
using ToolNexus.Infrastructure.Data;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class DatabaseProviderConfigurationTests
{
    [Fact]
    public void AddInfrastructure_DefaultConfiguration_UsesSqliteProvider()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder().Build();

        services.AddInfrastructure(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<DbContextOptions<ToolNexusContentDbContext>>();

        Assert.Contains(options.Extensions, extension => extension.GetType().Name.Contains("Sqlite", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void AddInfrastructure_PostgreSqlConfiguration_UsesNpgsqlProvider()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = "PostgreSQL",
                ["Database:ConnectionString"] = "Host=localhost;Port=5432;Database=toolnexus;Username=postgres;Password=postgres"
            })
            .Build();

        services.AddInfrastructure(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<DbContextOptions<ToolNexusContentDbContext>>();

        Assert.Contains(options.Extensions, extension => extension.GetType().Name.Contains("Npgsql", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void DesignTimeFactory_PostgreSqlArgs_ConfiguresNpgsqlProvider()
    {
        var factory = new ToolNexusContentDbContextFactory();

        using var context = factory.CreateDbContext([
            "--provider=PostgreSQL",
            "--connection=Host=localhost;Port=5432;Database=toolnexus;Username=postgres;Password=postgres"
        ]);

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", context.Database.ProviderName);
    }
}
