using Xunit;
using Microsoft.EntityFrameworkCore;

namespace ToolNexus.Infrastructure.Tests;

public sealed class AiToolPackagesMigrationSafetyTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task MigrateAsync_AiToolPackagesTableAlreadyExists_DoesNotFail(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateUnmigratedAsync(provider);
        await using var context = db.CreateContext();

        if (provider == TestDatabaseProvider.PostgreSql)
        {
            await context.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "AiToolPackages" (
                    "Id" uuid PRIMARY KEY,
                    "Slug" varchar(120) NOT NULL,
                    "Status" varchar(24) NOT NULL,
                    "JsonPayload" jsonb NOT NULL,
                    "CreatedUtc" timestamp with time zone NOT NULL,
                    "UpdatedUtc" timestamp with time zone NOT NULL,
                    "Version" integer NOT NULL,
                    "CorrelationId" varchar(120) NOT NULL,
                    "TenantId" varchar(120) NOT NULL
                );
                """);
        }

        await context.Database.MigrateAsync();
    }
}
