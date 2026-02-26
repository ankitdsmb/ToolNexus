using Microsoft.EntityFrameworkCore;
using Xunit;
using Xunit.Sdk;

namespace ToolNexus.Infrastructure.Tests.Migrations;

public sealed class PostgresMigrationIntegrityTests
{
    [Fact]
    public async Task EmptyDatabase_MigrateTwice_CompletesWithoutPendingMigrations()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();

        await context.Database.MigrateAsync();
        await context.Database.MigrateAsync();

        Assert.Empty(await context.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task PartiallyBootstrappedSchema_WithMissingConstraints_MigrationRemainsSafe()
    {
        await using var database = await CreatePostgresDatabaseOrSkipAsync();
        await using var context = database.CreateContext();

        await context.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS audit_outbox(id uuid primary key, audit_event_id uuid);");
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE audit_outbox DROP CONSTRAINT IF EXISTS \"FK_audit_outbox_audit_events_AuditEventId\";");

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
            throw new SkipException();
        }
    }
}
