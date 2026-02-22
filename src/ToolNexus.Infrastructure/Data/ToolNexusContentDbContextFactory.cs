using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ToolNexus.Infrastructure.Data;

public sealed class ToolNexusContentDbContextFactory : IDesignTimeDbContextFactory<ToolNexusContentDbContext>
{
    public ToolNexusContentDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<ToolNexusContentDbContext>();

        var provider = Environment.GetEnvironmentVariable("TOOLNEXUS_DB_PROVIDER")
            ?? Environment.GetEnvironmentVariable("Database__Provider")
            ?? "Sqlite";

        var connectionString = Environment.GetEnvironmentVariable("TOOLNEXUS_DB_CONNECTION_STRING")
            ?? Environment.GetEnvironmentVariable("Database__ConnectionString")
            ?? "Data Source=toolnexus.db";

        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            builder.UseSqlite(connectionString);
            return new ToolNexusContentDbContext(builder.Options);
        }

        throw new NotSupportedException(
            $"Unsupported database provider '{provider}' for design-time migrations in this phase.");
    }
}
