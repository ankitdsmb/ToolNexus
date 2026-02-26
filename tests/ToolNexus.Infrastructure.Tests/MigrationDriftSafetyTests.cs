using Microsoft.EntityFrameworkCore;
using Xunit;
using Xunit.Sdk;

namespace ToolNexus.Infrastructure.Tests;

public sealed class MigrationDriftSafetyTests
{
    [Fact]
    public async Task MissingForeignKey_DriftedSchema_MigrationReplayIsSafe()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();

        await context.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS migration_safety_fk_parent(id integer primary key);");
        await context.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS migration_safety_fk_child(id integer primary key, parent_id integer);");
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE migration_safety_fk_child DROP CONSTRAINT IF EXISTS fk_migration_safety_fk_child_parent;");

        await context.Database.ExecuteSqlRawAsync(@"
            DO $$
            BEGIN
                IF to_regclass('migration_safety_fk_child') IS NOT NULL THEN
                    ALTER TABLE ""migration_safety_fk_child"" DROP CONSTRAINT IF EXISTS ""fk_migration_safety_fk_child_parent"";
                END IF;
            END $$;");

        await context.Database.MigrateAsync();
        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task MissingIndex_DriftedSchema_MigrationReplayIsSafe()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();

        await context.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS migration_safety_idx(id integer primary key, correlation_id text);");
        await context.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS idx_migration_safety_missing;");
        await context.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS \"idx_migration_safety_missing\";");

        await context.Database.MigrateAsync();
        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task PartialPreviousMigrationState_DriftedObjects_DoNotBlockMigration()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();

        await context.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS audit_outbox(id uuid primary key, audit_event_id uuid);");
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE audit_outbox DROP CONSTRAINT IF EXISTS \"FK_audit_outbox_audit_events_AuditEventId\";");

        await context.Database.MigrateAsync();
        await context.Database.MigrateAsync();

        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task MigrationReplay_Twice_RemainsStable()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();

        await context.Database.MigrateAsync();
        await context.Database.MigrateAsync();

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
            throw new SkipException("PostgreSQL integration test database is not configured for migration drift tests.");
        }
    }
}
