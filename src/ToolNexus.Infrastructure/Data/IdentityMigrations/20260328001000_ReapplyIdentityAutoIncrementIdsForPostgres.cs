using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Data.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.IdentityMigrations;

/// <inheritdoc />
[DbContext(typeof(ToolNexusIdentityDbContext))]
[Migration("20260328001000_ReapplyIdentityAutoIncrementIdsForPostgres")]
public partial class ReapplyIdentityAutoIncrementIdsForPostgres : Migration
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
        // Drift-safe no-op.
    }
}
