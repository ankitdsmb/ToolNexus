using System.Text;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ToolNexus.Infrastructure.Data.Migrations;

internal static class MigrationSafetyExtensions
{
    public static void SafeAlterIdentityIfNeeded(this MigrationBuilder migrationBuilder, string tableName, string columnName = "Id")
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.SafeNoOpIfIdentityExists(tableName, columnName));
    }

    public static void SafeEnsureIdentityByDefaultIfMissing(this MigrationBuilder migrationBuilder, string tableName, string columnName = "Id")
    {
        migrationBuilder.SafeAlterIdentityIfNeeded(tableName, columnName);
    }

    public static void SafeDropConstraintIfExists(this MigrationBuilder migrationBuilder, string tableName, string constraintName)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            migrationBuilder.DropForeignKey(
                name: constraintName,
                table: tableName);

            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.SafeDropConstraintIfExists(tableName, constraintName));
    }

    public static void SafeAddColumnIfMissing(this MigrationBuilder migrationBuilder, string tableName, string columnName, string columnDefinitionSql)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.SafeAddColumnIfMissing(tableName, columnName, columnDefinitionSql));
    }


    public static void SafeConvertColumnToBoolean(this MigrationBuilder migrationBuilder, string tableName, string columnName)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            migrationBuilder.AlterColumn<bool>(
                name: columnName,
                table: tableName,
                type: "boolean",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");
            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.SafeConvertColumnToBoolean(tableName, columnName));
    }


    public static void SafeConvertToBoolean(this MigrationBuilder migrationBuilder, string tableName, string columnName)
    {
        migrationBuilder.SafeConvertColumnToBoolean(tableName, columnName);
    }

    public static void SafeConvertToInet(this MigrationBuilder migrationBuilder, string tableName, string columnName)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.SafeConvertToInet(tableName, columnName));
    }

    public static void SafeConvertColumn(this MigrationBuilder migrationBuilder, string tableName, string columnName, string strategy)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            return;
        }

        migrationBuilder.Sql(PostgresMigrationSafety.SafeConvertColumn(tableName, columnName, strategy));
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

    public static void SafeIndexCreateIfMissing(this MigrationBuilder migrationBuilder, string indexName, string tableName, string columnsSql)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            migrationBuilder.CreateIndex(
                name: indexName,
                table: tableName,
                column: columnsSql);

            return;
        }

        migrationBuilder.Sql($"""
            DO $$
            BEGIN
                IF to_regclass('{EscapeSqlLiteral(indexName)}') IS NULL THEN
                    EXECUTE format(
                        'CREATE INDEX %I ON %I ({columnsSql})',
                        '{EscapeSqlLiteral(indexName)}',
                        '{EscapeSqlLiteral(tableName)}');
                END IF;
            END $$;
            """);
    }

    public static void SafeRenameColumnIfExists(this MigrationBuilder migrationBuilder, string name, string table, string newName)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            migrationBuilder.RenameColumn(name: name, table: table, newName: newName);
            return;
        }

        migrationBuilder.Sql($"""
            DO $$
            BEGIN
                IF to_regclass('{EscapeSqlLiteral(table)}') IS NOT NULL
                   AND EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{EscapeSqlLiteral(table)}'
                          AND column_name = '{EscapeSqlLiteral(name)}')
                   AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = '{EscapeSqlLiteral(table)}'
                          AND column_name = '{EscapeSqlLiteral(newName)}')
                THEN
                    ALTER TABLE {QuoteIdentifier(table)} RENAME COLUMN {QuoteIdentifier(name)} TO {QuoteIdentifier(newName)};
                END IF;
            END $$;
            """);
    }

    public static void SafeRenameIndexIfExists(this MigrationBuilder migrationBuilder, string name, string table, string newName)
    {
        if (!IsPostgreSqlProvider(migrationBuilder))
        {
            migrationBuilder.RenameIndex(name: name, table: table, newName: newName);
            return;
        }

        migrationBuilder.Sql($"""
            DO $$
            BEGIN
                IF to_regclass('{EscapeSqlLiteral(name)}') IS NOT NULL
                   AND to_regclass('{EscapeSqlLiteral(newName)}') IS NULL
                THEN
                    ALTER INDEX {QuoteIdentifier(name)} RENAME TO {QuoteIdentifier(newName)};
                END IF;
            END $$;
            """);
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
