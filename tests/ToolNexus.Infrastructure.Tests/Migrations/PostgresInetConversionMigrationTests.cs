using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Xunit;
using Xunit.Sdk;

namespace ToolNexus.Infrastructure.Tests.Migrations;

public sealed class PostgresInetConversionMigrationTests
{
    private const string BaselineMigration = "20260302000000_AddAuditEventsTable";
    private const string ConversionMigration = "20260225214033_AddExecutionLedger";

    [Fact]
    public async Task SourceIp_TextValues_ConvertSafelyToInet()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync(BaselineMigration);

        await context.Database.ExecuteSqlRawAsync("""
            INSERT INTO "audit_events" ("id", "occurred_at_utc", "actor_type", "action", "result_status", "payload_redacted", "payload_hash_sha256", "schema_version", "source_ip")
            VALUES ('00000000-0000-0000-0000-000000000001', NOW(), 'system', 'seed', 'ok', '{}', 'hash', 1, '10.20.30.40');
            """);

        await migrator.MigrateAsync(ConversionMigration);

        var dataType = await context.Database.SqlQueryRaw<string>("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'audit_events'
              AND column_name = 'source_ip';
            """).SingleAsync();

        var parsed = await context.Database.SqlQueryRaw<string>("SELECT COALESCE(MAX(source_ip::text), '') FROM \"audit_events\";").SingleAsync();

        Assert.Equal("inet", dataType);
        Assert.Equal("10.20.30.40", parsed);
    }

    [Fact]
    public async Task SourceIp_InvalidText_DoesNotCrashAndBecomesNull()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();
        var migrator = context.Database.GetService<IMigrator>();

        await migrator.MigrateAsync(BaselineMigration);

        await context.Database.ExecuteSqlRawAsync("""
            INSERT INTO "audit_events" ("id", "occurred_at_utc", "actor_type", "action", "result_status", "payload_redacted", "payload_hash_sha256", "schema_version", "source_ip")
            VALUES ('00000000-0000-0000-0000-000000000002', NOW(), 'system', 'seed', 'ok', '{}', 'hash', 1, 'not_an_ip');
            """);

        await migrator.MigrateAsync(ConversionMigration);

        var nullCount = await context.Database.SqlQueryRaw<int>("SELECT COUNT(*) FROM \"audit_events\" WHERE \"source_ip\" IS NULL;").SingleAsync();

        Assert.Equal(1, nullCount);
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
            throw new SkipException();
        }
    }
}
