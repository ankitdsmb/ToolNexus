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
    public async Task AlreadyBooleanColumn_MigrationSucceeds()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync(BaselineMigration);

        await context.Database.ExecuteSqlRawAsync("ALTER TABLE \"ToolExecutionPolicies\" ALTER COLUMN \"IsExecutionEnabled\" TYPE boolean USING (\"IsExecutionEnabled\"::integer = 1);");

        await migrator.MigrateAsync(ConversionMigration);

        var dataType = await context.Database.SqlQueryRaw<string>("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'ToolExecutionPolicies'
              AND column_name = 'IsExecutionEnabled';
            """).SingleAsync();

        Assert.Equal("boolean", dataType);
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


    [Fact]
    public async Task SuccessColumn_TextValues_ConvertsSafely()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync("20260225000000_AddToolExecutionEvents");

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "ToolExecutionEvents" ALTER COLUMN "Success" TYPE text USING CASE WHEN "Success" = 1 THEN 'success' ELSE 'failed' END;
            UPDATE "ToolExecutionEvents" SET "Success" = CASE WHEN ("Id" % 2) = 0 THEN 'true' ELSE 'failed' END;
            """);

        await migrator.MigrateAsync(ConversionMigration);

        var dataType = await context.Database.SqlQueryRaw<string>("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'ToolExecutionEvents'
              AND column_name = 'Success';
            """).SingleAsync();

        Assert.Equal("boolean", dataType);
    }

    [Fact]
    public async Task SuccessColumn_IntegerValues_ConvertsSafely()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync("20260225000000_AddToolExecutionEvents");

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "ToolExecutionEvents" ALTER COLUMN "Success" TYPE integer USING CASE WHEN "Success" THEN 1 ELSE 0 END;
            UPDATE "ToolExecutionEvents" SET "Success" = CASE WHEN ("Id" % 2) = 0 THEN 1 ELSE 0 END;
            """);

        await migrator.MigrateAsync(ConversionMigration);

        var dataType = await context.Database.SqlQueryRaw<string>("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'ToolExecutionEvents'
              AND column_name = 'Success';
            """).SingleAsync();

        Assert.Equal("boolean", dataType);
    }

    [Fact]
    public async Task SuccessColumn_AlreadyBoolean_MigrationSucceeds()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync("20260225000000_AddToolExecutionEvents");

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "ToolExecutionEvents" ALTER COLUMN "Success" TYPE boolean USING ("Success" = 1);
            """);

        await migrator.MigrateAsync(ConversionMigration);

        var dataType = await context.Database.SqlQueryRaw<string>("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'ToolExecutionEvents'
              AND column_name = 'Success';
            """).SingleAsync();

        Assert.Equal("boolean", dataType);
    }

    [Fact]
    public async Task SuccessColumn_ConversionMigration_Rerun_DoesNotFail()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync("20260225000000_AddToolExecutionEvents");

        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "ToolExecutionEvents" ALTER COLUMN "Success" TYPE text USING CASE WHEN "Success" = 1 THEN 'yes' ELSE 'no' END;
            UPDATE "ToolExecutionEvents" SET "Success" = 'success';
            """);

        await migrator.MigrateAsync(ConversionMigration);
        await migrator.MigrateAsync(ConversionMigration);

        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
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
            throw SkipException.ForSkip("PostgreSQL test database unavailable.");
        }
    }
}
