using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.IdentityMigrations;

/// <inheritdoc />
public partial class FixIdentityAutoIncrementIds : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        if (!ActiveProvider.Contains("Npgsql", System.StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.EnsureIdentityColumnSafe("AspNetUserClaims", "Id"));
        migrationBuilder.Sql(PostgresMigrationSafety.EnsureIdentityColumnSafe("AspNetRoleClaims", "Id"));
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Intentionally no-op for PostgreSQL drift safety.
    }
}
