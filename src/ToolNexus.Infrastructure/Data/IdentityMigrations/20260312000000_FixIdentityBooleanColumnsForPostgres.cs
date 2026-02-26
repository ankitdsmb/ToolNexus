using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Infrastructure.Data.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.IdentityMigrations;

/// <inheritdoc />
[DbContext(typeof(ToolNexusIdentityDbContext))]
[Migration("20260312000000_FixIdentityBooleanColumnsForPostgres")]
public partial class FixIdentityBooleanColumnsForPostgres : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        if (!ActiveProvider.Contains("Npgsql", System.StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.SafeConvertColumnToBoolean("AspNetUsers", "EmailConfirmed"));
        migrationBuilder.Sql(PostgresMigrationSafety.SafeConvertColumnToBoolean("AspNetUsers", "PhoneNumberConfirmed"));
        migrationBuilder.Sql(PostgresMigrationSafety.SafeConvertColumnToBoolean("AspNetUsers", "TwoFactorEnabled"));
        migrationBuilder.Sql(PostgresMigrationSafety.SafeConvertColumnToBoolean("AspNetUsers", "LockoutEnabled"));
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drift-safe no-op.
    }
}
