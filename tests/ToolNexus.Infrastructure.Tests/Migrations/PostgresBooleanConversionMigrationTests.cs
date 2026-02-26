using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Xunit;
using Xunit.Sdk;

namespace ToolNexus.Infrastructure.Tests.Migrations;

public sealed class PostgresBooleanConversionMigrationTests
{
    private const string BaselineMigration = "20260224000000_AddExecutionPolicies";
    private const string ConversionMigration = "20260225214033_AddExecutionLedger";

    [Fact]
    public async Task ExistingNonBooleanColumn_ConvertsSafely()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync(BaselineMigration);

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "ToolExecutionPolicies" ALTER COLUMN "IsExecutionEnabled" TYPE text USING CASE
                WHEN "IsExecutionEnabled" = 1 THEN 'yes'
                ELSE '0'
            END;
            UPDATE "ToolExecutionPolicies" SET "IsExecutionEnabled" = '1';
            """);

        await migrator.MigrateAsync(ConversionMigration);

        var dataType = await context.Database.SqlQueryRaw<string>("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'ToolExecutionPolicies'
              AND column_name = 'IsExecutionEnabled';
            """).SingleAsync();

        var casted = await context.Database.SqlQueryRaw<bool>("SELECT COALESCE(bool_or(\"IsExecutionEnabled\"), false) FROM \"ToolExecutionPolicies\";").SingleAsync();

        Assert.Equal("boolean", dataType);
        Assert.True(casted);
    }

    [Fact]
    public async Task AlreadyBooleanColumn_MigrationReconcilesNullabilityAndDefault()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync(BaselineMigration);

        await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"ToolExecutionPolicies\" ALTER COLUMN \"IsExecutionEnabled\" TYPE boolean USING (\"IsExecutionEnabled\"::integer = 1);");
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"ToolExecutionPolicies\" ALTER COLUMN \"IsExecutionEnabled\" DROP NOT NULL;");
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"ToolExecutionPolicies\" ALTER COLUMN \"IsExecutionEnabled\" SET DEFAULT NULL;");
        await context.Database.ExecuteSqlRawAsync("UPDATE \"ToolExecutionPolicies\" SET \"IsExecutionEnabled\" = NULL;");

        await migrator.MigrateAsync(ConversionMigration);

        var state = await context.Database.SqlQueryRaw<BooleanColumnState>("""
            SELECT
                data_type AS "DataType",
                is_nullable AS "IsNullable",
                column_default AS "ColumnDefault"
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'ToolExecutionPolicies'
              AND column_name = 'IsExecutionEnabled';
            """).SingleAsync();

        var hasNulls = await context.Database.SqlQueryRaw<bool>("SELECT EXISTS (SELECT 1 FROM \"ToolExecutionPolicies\" WHERE \"IsExecutionEnabled\" IS NULL);").SingleAsync();

        Assert.Equal("boolean", state.DataType);
        Assert.Equal("NO", state.IsNullable);
        Assert.Contains("false", state.ColumnDefault ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.False(hasNulls);
    }

    [Fact]
    public async Task ConversionMigration_Rerun_DoesNotFail()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync(BaselineMigration);

        await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"ToolExecutionPolicies\" ALTER COLUMN \"IsExecutionEnabled\" TYPE text USING 'no';");

        await migrator.MigrateAsync(ConversionMigration);
        await migrator.MigrateAsync(ConversionMigration);

        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    private sealed class BooleanColumnState
    {
        public string DataType { get; set; } = string.Empty;

        public string IsNullable { get; set; } = string.Empty;

        public string? ColumnDefault { get; set; }
    }

    private static async Task<TestDatabaseInstance> CreatePostgresDatabaseOrSkipAsync()
    {
        try
        {
            return await TestDatabaseInstance.CreateUnmigratedAsync(TestDatabaseProvider.PostgreSql);
        }
        catch (SkipException)
        {
            throw;
        }
        catch
        {
            throw new SkipException("PostgreSQL test database unavailable.");
        }
    }
}
