using Microsoft.EntityFrameworkCore;
using Npgsql;
using ToolNexus.Infrastructure.Content.Entities;
using Xunit;
using Xunit.Sdk;

namespace ToolNexus.Infrastructure.Tests;

public sealed class ExecutionLedgerRelationalSafetyTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task DeletingExecutionRun_CascadesOwnedExecutionArtifacts(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        Guid runId;
        await using (var context = database.CreateContext())
        {
            runId = await SeedExecutionRunAsync(context, "corr-cascade", "tenant-cascade");
        }

        await using (var context = database.CreateContext())
        {
            var run = await context.ExecutionRuns.SingleAsync(x => x.Id == runId);
            context.ExecutionRuns.Remove(run);
            await context.SaveChangesAsync();
        }

        await using var verify = database.CreateContext();
        Assert.False(await verify.ExecutionRuns.AnyAsync(x => x.Id == runId));
        Assert.False(await verify.ExecutionSnapshots.AnyAsync(x => x.ExecutionRunId == runId));
        Assert.False(await verify.ExecutionConformanceResults.AnyAsync(x => x.ExecutionRunId == runId));
        Assert.False(await verify.ExecutionAuthorityDecisions.AnyAsync(x => x.ExecutionRunId == runId));
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task DeletingGovernanceDecision_WithReferencedSnapshot_IsBlocked(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);

        Guid decisionId;
        await using (var context = database.CreateContext())
        {
            _ = await SeedExecutionRunAsync(context, "corr-restrict", "tenant-restrict");
            decisionId = await context.GovernanceDecisions.Select(x => x.DecisionId).SingleAsync();
        }

        await using var deleteAttempt = database.CreateContext();
        var decision = await deleteAttempt.GovernanceDecisions.SingleAsync(x => x.DecisionId == decisionId);
        deleteAttempt.GovernanceDecisions.Remove(decision);

        await Assert.ThrowsAsync<DbUpdateException>(() => deleteAttempt.SaveChangesAsync());
    }

    [Fact]
    public async Task PostgreSql_ExecutionRunIndexes_IncludeCorrelationTenantAndTimestamp()
    {
        TestDatabaseInstance database;
        try
        {
            database = await TestDatabaseInstance.CreateAsync(TestDatabaseProvider.PostgreSql);
        }
        catch (Exception ex) when (ex is InvalidOperationException or SkipException)
        {
            return;
        }

        await using var _ = database;
        await using var context = database.CreateContext();
        var connectionString = context.Database.GetConnectionString();
        Assert.False(string.IsNullOrWhiteSpace(connectionString));

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            select indexname, indexdef
            from pg_indexes
            where schemaname = current_schema()
              and tablename = 'ExecutionRuns';";

        var indexDefinitions = new List<string>();
        await using (var reader = await command.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                indexDefinitions.Add(reader.GetString(1));
            }
        }

        Assert.Contains(indexDefinitions, index => index.Contains("\"CorrelationId\"", StringComparison.Ordinal));
        Assert.Contains(indexDefinitions, index => index.Contains("\"TenantId\"", StringComparison.Ordinal));
        Assert.Contains(indexDefinitions, index => index.Contains("\"ExecutedAtUtc\"", StringComparison.Ordinal));
    }

    private static async Task<Guid> SeedExecutionRunAsync(ToolNexus.Infrastructure.Data.ToolNexusContentDbContext context, string correlationId, string tenantId)
    {
        var runId = Guid.NewGuid();
        var decisionId = Guid.NewGuid();

        context.GovernanceDecisions.Add(new GovernanceDecisionEntity
        {
            DecisionId = decisionId,
            ToolId = "json-validator",
            CapabilityId = "validate",
            Authority = "UnifiedAuthoritative",
            ApprovedBy = "server",
            DecisionReason = "Allowed",
            PolicyVersion = "json",
            TimestampUtc = DateTime.UtcNow,
            Status = "Approved"
        });

        context.ExecutionRuns.Add(new ExecutionRunEntity
        {
            Id = runId,
            ToolId = "json-validator",
            ExecutedAtUtc = DateTime.UtcNow,
            Success = true,
            DurationMs = 10,
            PayloadSize = 100,
            ExecutionMode = "Sandbox",
            RuntimeLanguage = "dotnet",
            AdapterName = "DotNetExecutionAdapter",
            AdapterResolutionStatus = "resolved",
            Capability = "validate",
            Authority = "UnifiedAuthoritative",
            CorrelationId = correlationId,
            TenantId = tenantId,
            TraceId = "trace-1",
            Snapshot = new ExecutionSnapshotEntity
            {
                Id = Guid.NewGuid(),
                SnapshotId = Guid.NewGuid().ToString("N"),
                Authority = "UnifiedAuthoritative",
                RuntimeLanguage = "dotnet",
                ExecutionCapability = "validate",
                TimestampUtc = DateTime.UtcNow,
                ConformanceVersion = "v1",
                GovernanceDecisionId = decisionId
            },
            Conformance = new ExecutionConformanceResultEntity
            {
                Id = Guid.NewGuid(),
                IsValid = true,
                NormalizedStatus = "ok",
                WasNormalized = false,
                IssueCount = 0,
                IssuesJson = "[]"
            },
            AuthorityDecision = new ExecutionAuthorityDecisionEntity
            {
                Id = Guid.NewGuid(),
                Authority = "UnifiedAuthoritative",
                AdmissionAllowed = true,
                AdmissionReason = "Allowed",
                DecisionSource = "policy"
            }
        });

        await context.SaveChangesAsync();
        return runId;
    }
}
