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


    [Theory]
    [InlineData("PostgreSQL")]
    [InlineData("postgres")]
    [InlineData("Npgsql")]
    public void AddInfrastructure_PostgreSqlAliases_UseNpgsqlProvider(string providerName)
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = providerName,
                ["Database:ConnectionString"] = "Host=localhost;Port=5432;Database=toolnexus;Username=postgres;Password=postgres"
            })
            .Build();

        services.AddInfrastructure(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<DbContextOptions<ToolNexusContentDbContext>>();

        Assert.Contains(options.Extensions, extension => extension.GetType().Name.Contains("Npgsql", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void AddInfrastructure_UnsupportedProvider_Throws()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:Provider"] = "MySql",
                ["Database:ConnectionString"] = "Server=localhost;Database=toolnexus"
            })
            .Build();

        services.AddInfrastructure(configuration);

        using var provider = services.BuildServiceProvider();
        var error = Assert.Throws<NotSupportedException>(() =>
            provider.GetRequiredService<DbContextOptions<ToolNexusContentDbContext>>());

        Assert.Contains("Unsupported database provider", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void DesignTimeFactory_DefaultArgs_ConfiguresPostgreSqlProvider()
    {
        var factory = new ToolNexusContentDbContextFactory();

        using var context = factory.CreateDbContext([]);

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", context.Database.ProviderName);
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

    [Fact]
    public void DesignTimeFactory_PostgreSqlUriArgs_NormalizesToNpgsqlConnectionString()
    {
        var factory = new ToolNexusContentDbContextFactory();

        using var context = factory.CreateDbContext([
            "--provider=PostgreSQL",
            "--connection=postgresql://postgres:postgres@localhost:5432/toolnexus?sslmode=require&channel_binding=require"
        ]);

        var connectionString = context.Database.GetDbConnection().ConnectionString;
        Assert.Contains("Host=localhost", connectionString, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Database=toolnexus", connectionString, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Channel Binding=Require", connectionString, StringComparison.OrdinalIgnoreCase);
    }
}
