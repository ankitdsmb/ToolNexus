using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ToolNexus.Infrastructure.Data;

public sealed class ToolNexusContentDbContextFactory : IDesignTimeDbContextFactory<ToolNexusContentDbContext>
{
    public ToolNexusContentDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<ToolNexusContentDbContext>();

        var providerArg = args.FirstOrDefault(arg => arg.StartsWith("--provider=", StringComparison.OrdinalIgnoreCase));
        var connectionArg = args.FirstOrDefault(arg => arg.StartsWith("--connection=", StringComparison.OrdinalIgnoreCase));

        var provider = providerArg?.Split('=', 2)[1]?.Trim();

        if (string.IsNullOrWhiteSpace(provider))
        {
            provider = Environment.GetEnvironmentVariable("TOOLNEXUS_DB_PROVIDER")?.Trim();
        }

        if (string.IsNullOrWhiteSpace(provider))
        {
            provider = Environment.GetEnvironmentVariable("Database__Provider")?.Trim();
        }

        provider ??= DatabaseProviderConfiguration.PostgreSqlProvider;

        var connectionString = connectionArg?.Split('=', 2)[1]
            ?? Environment.GetEnvironmentVariable("TOOLNEXUS_DB_CONNECTION_STRING")
            ?? Environment.GetEnvironmentVariable("Database__ConnectionString")
            ?? "Host=localhost;Port=5432;Database=toolnexus;Username=postgres;Password=postgres";

        DatabaseProviderConfiguration.Configure(builder, provider, connectionString);

        return new ToolNexusContentDbContext(builder.Options);
    }
}
