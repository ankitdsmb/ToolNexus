using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ToolNexus.Infrastructure.Data;

public sealed class ToolNexusContentDbContextFactory : IDesignTimeDbContextFactory<ToolNexusContentDbContext>
{
    public ToolNexusContentDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<ToolNexusContentDbContext>();
        builder.UseSqlite("Data Source=toolnexus.db");
        return new ToolNexusContentDbContext(builder.Options);
    }
}
