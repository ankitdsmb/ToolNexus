using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.IdentityMigrations;

/// <inheritdoc />
[DbContext(typeof(ToolNexusIdentityDbContext))]
[Migration("20260327000000_FixIdentityLockoutEndForPostgres")]
public partial class FixIdentityLockoutEndForPostgres : Migration
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
            DO $$
            BEGIN
                IF to_regclass('"AspNetUsers"') IS NOT NULL
                   AND EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'AspNetUsers'
                          AND column_name = 'LockoutEnd'
                          AND udt_name IN ('text', 'varchar'))
                THEN
                    CREATE OR REPLACE FUNCTION pg_temp.tn_try_timestamptz(value_text text)
                    RETURNS timestamp with time zone
                    LANGUAGE plpgsql
                    AS $$
                    BEGIN
                        RETURN value_text::timestamp with time zone;
                    EXCEPTION
                        WHEN others THEN
                            RETURN NULL;
                    END;
                    $$;

                    ALTER TABLE "AspNetUsers"
                    ALTER COLUMN "LockoutEnd" TYPE timestamp with time zone
                    USING pg_temp.tn_try_timestamptz("LockoutEnd");
                END IF;
            END $$;
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
            DO $$
            BEGIN
                IF to_regclass('"AspNetUsers"') IS NOT NULL
                   AND EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'AspNetUsers'
                          AND column_name = 'LockoutEnd'
                          AND udt_name = 'timestamptz')
                THEN
                    ALTER TABLE "AspNetUsers"
                    ALTER COLUMN "LockoutEnd" TYPE text
                    USING "LockoutEnd"::text;
                END IF;
            END $$;
            """);
    }
}
