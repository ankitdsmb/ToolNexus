using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Content;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfAdminExecutionMonitoringRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task MissingAuditTables_ReturnSafeHealthSnapshot(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        await using (var context = db.CreateContext())
        {
            await DropAuditTablesAsync(context, provider);
            await DropRuntimeIncidentTableAsync(context);
        }

        await using var verifyContext = db.CreateContext();
        var repository = new EfAdminExecutionMonitoringRepository(verifyContext);

        var result = await repository.GetHealthSnapshotAsync(CancellationToken.None);

        Assert.Equal(0, result.PendingItems);
        Assert.Equal(0, result.RetryCount);
        Assert.Equal(0, result.DeadLetterCount);
        Assert.Null(result.OldestPendingCreatedAtUtc);
        Assert.Equal(0, result.RecentBacklogCount);
        Assert.Equal(0, result.PreviousBacklogCount);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task MissingAuditAndRuntimeTables_ReturnSafeWorkersAndIncidents(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        await using (var context = db.CreateContext())
        {
            await DropAuditTablesAsync(context, provider);
            await DropRuntimeIncidentTableAsync(context);
        }

        await using var verifyContext = db.CreateContext();
        var repository = new EfAdminExecutionMonitoringRepository(verifyContext);

        var workers = await repository.GetWorkerSnapshotsAsync(DateTime.UtcNow, CancellationToken.None);
        var incidents = await repository.GetIncidentSnapshotsAsync(1, 20, CancellationToken.None);

        Assert.Empty(workers);
        Assert.Equal(1, incidents.Page);
        Assert.Equal(20, incidents.PageSize);
        Assert.Equal(0, incidents.TotalItems);
        Assert.Empty(incidents.Items);
    }


    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task IncidentsQuery_IncludesRuntimeIncidents(TestDatabaseProvider provider)
    {
        await using var db = await TestDatabaseInstance.CreateAsync(provider);
        await using (var seed = db.CreateContext())
        {
            seed.RuntimeIncidents.Add(new RuntimeIncidentEntity
            {
                Fingerprint = "json-formatter::execute::contract_violation::legacy mismatch::html_element",
                ToolSlug = "json-formatter",
                Phase = "execute",
                ErrorType = "contract_violation",
                Message = "legacy mismatch",
                PayloadType = "html_element",
                Severity = "warning",
                Count = 3,
                FirstOccurredUtc = DateTime.UtcNow.AddMinutes(-5),
                LastOccurredUtc = DateTime.UtcNow
            });
            await seed.SaveChangesAsync();
        }

        await using var verify = db.CreateContext();
        var repository = new EfAdminExecutionMonitoringRepository(verify);

        var incidents = await repository.GetIncidentSnapshotsAsync(1, 20, CancellationToken.None);

        Assert.Contains(incidents.Items, x => x.EventType == "runtime_incident" && x.Destination == "json-formatter" && x.AttemptCount == 3);
    }

    private static async Task DropRuntimeIncidentTableAsync(DbContext context)
        => await context.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS \"RuntimeIncidents\";");

    private static async Task DropAuditTablesAsync(DbContext context, TestDatabaseProvider provider)
    {
        if (provider == TestDatabaseProvider.PostgreSql)
        {
            await context.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS audit_dead_letter;");
            await context.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS audit_outbox;");
            return;
        }

        await context.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS audit_dead_letter;");
        await context.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS audit_outbox;");
    }
}
