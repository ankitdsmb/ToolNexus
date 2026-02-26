using System.Text;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ToolNexus.Infrastructure.Data.Migrations;

internal static class MigrationSafetyExtensions
{
    public static void SafeDropConstraintIfExists(this MigrationBuilder migrationBuilder, string tableName, string constraintName)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            migrationBuilder.DropForeignKey(
                name: constraintName,
                table: tableName);

            return;
        }

        migrationBuilder.Sql($"""
            DO $$
            BEGIN
                IF to_regclass('{EscapeSqlLiteral(tableName)}') IS NOT NULL THEN
                    ALTER TABLE {QuoteIdentifier(tableName)} DROP CONSTRAINT IF EXISTS {QuoteIdentifier(constraintName)};
                END IF;
            END $$;
            """);
    }

    public static void SafeDropIndexIfExists(this MigrationBuilder migrationBuilder, string tableName, string indexName)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            migrationBuilder.DropIndex(
                name: indexName,
                table: tableName);

            return;
        }

        migrationBuilder.Sql($"DROP INDEX IF EXISTS {QuoteIdentifier(indexName)};");
    }

    private static bool IsPostgreSqlProvider(MigrationBuilder migrationBuilder)
        => migrationBuilder.ActiveProvider?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;

    private static string QuoteIdentifier(string identifier)
    {
        var parts = identifier.Split('.', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        var builder = new StringBuilder();

        for (var index = 0; index < parts.Length; index++)
        {
            if (index > 0)
            {
                builder.Append('.');
            }

            builder.Append('"');
            builder.Append(parts[index].Replace("\"", "\"\"", StringComparison.Ordinal));
            builder.Append('"');
        }

        return builder.ToString();
    }

    private static string EscapeSqlLiteral(string value)
        => value.Replace("'", "''", StringComparison.Ordinal);
}
