using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ToolNexus.Infrastructure.Data;

public sealed class ToolNexusIdentityDbContextFactory : IDesignTimeDbContextFactory<ToolNexusIdentityDbContext>
{
    public ToolNexusIdentityDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ToolNexusIdentityDbContext>();
        var provider = Environment.GetEnvironmentVariable("TOOLNEXUS_DB_PROVIDER") ?? "Sqlite";
        var connectionString = Environment.GetEnvironmentVariable("TOOLNEXUS_DB_CONNECTION") ?? "Data Source=toolnexus.db";
        DatabaseProviderConfiguration.Configure(optionsBuilder, provider, connectionString);
        return new ToolNexusIdentityDbContext(optionsBuilder.Options);
    }
}
