using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.IdentityMigrations;

/// <inheritdoc />
public partial class FixIdentityBooleanColumnsForPostgres : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        if (!ActiveProvider.Contains("Npgsql", System.StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        migrationBuilder.Sql(
            """
            ALTER TABLE "AspNetUsers"
                ALTER COLUMN "EmailConfirmed" TYPE boolean USING ("EmailConfirmed" <> 0),
                ALTER COLUMN "PhoneNumberConfirmed" TYPE boolean USING ("PhoneNumberConfirmed" <> 0),
                ALTER COLUMN "TwoFactorEnabled" TYPE boolean USING ("TwoFactorEnabled" <> 0),
                ALTER COLUMN "LockoutEnabled" TYPE boolean USING ("LockoutEnabled" <> 0);
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        if (!ActiveProvider.Contains("Npgsql", System.StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        migrationBuilder.Sql(
            """
            ALTER TABLE "AspNetUsers"
                ALTER COLUMN "EmailConfirmed" TYPE integer USING CASE WHEN "EmailConfirmed" THEN 1 ELSE 0 END,
                ALTER COLUMN "PhoneNumberConfirmed" TYPE integer USING CASE WHEN "PhoneNumberConfirmed" THEN 1 ELSE 0 END,
                ALTER COLUMN "TwoFactorEnabled" TYPE integer USING CASE WHEN "TwoFactorEnabled" THEN 1 ELSE 0 END,
                ALTER COLUMN "LockoutEnabled" TYPE integer USING CASE WHEN "LockoutEnabled" THEN 1 ELSE 0 END;
            """);
    }
}
