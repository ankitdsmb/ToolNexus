using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Content.Entities;
using Xunit;
using Xunit.Sdk;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfExecutionLedgerRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task GetExecutionsAsync_ReturnsPagedResults(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        await using (var seed = database.CreateContext())
        {
            var runId = Guid.NewGuid();
            var decisionId = Guid.NewGuid();
            seed.GovernanceDecisions.Add(new GovernanceDecisionEntity
            {
                DecisionId = decisionId,
                ToolId = "json-formatter",
                CapabilityId = "format",
                Authority = "LegacyAuthoritative",
                ApprovedBy = "server",
                DecisionReason = "Allowed",
                PolicyVersion = "json",
                TimestampUtc = DateTime.UtcNow,
                Status = "Approved"
            });

            seed.ExecutionRuns.Add(new ExecutionRunEntity
            {
                Id = runId,
                ToolId = "json-formatter",
                ExecutedAtUtc = DateTime.UtcNow,
                Success = true,
                DurationMs = 12,
                PayloadSize = 50,
                ExecutionMode = "Local",
                RuntimeLanguage = "dotnet",
                AdapterName = "Legacy",
                AdapterResolutionStatus = "legacy",
                Capability = "format",
                Authority = "LegacyAuthoritative",
                CorrelationId = "corr-1",
                TenantId = "tenant-a",
                TraceId = "trace-1",
                Snapshot = new ExecutionSnapshotEntity { Id = Guid.NewGuid(), SnapshotId = "snap-1", Authority = "LegacyAuthoritative", RuntimeLanguage = "dotnet", ExecutionCapability = "format", TimestampUtc = DateTime.UtcNow, ConformanceVersion = "v1", GovernanceDecisionId = decisionId },
                Conformance = new ExecutionConformanceResultEntity { Id = Guid.NewGuid(), IsValid = true, NormalizedStatus = "ok", WasNormalized = false, IssueCount = 0, IssuesJson = "[]" },
                AuthorityDecision = new ExecutionAuthorityDecisionEntity { Id = Guid.NewGuid(), Authority = "LegacyAuthoritative", AdmissionAllowed = true, AdmissionReason = "Allowed", DecisionSource = "policy" }
            });
            await seed.SaveChangesAsync();
        }

        await using var verify = database.CreateContext();
        var repository = new EfExecutionLedgerRepository(verify);

        var page = await repository.GetExecutionsAsync(new ToolNexus.Application.Models.ExecutionLedgerQuery(1, 10, "corr-1", null, null), CancellationToken.None);

        Assert.Single(page.Items);
        Assert.Equal("json-formatter", page.Items[0].ToolId);
    }

    [Fact]
    public async Task PostgreSql_ExecutionLedgerSchema_PersistsAndQueries()
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

        var run = new ExecutionRunEntity
        {
            Id = Guid.NewGuid(),
            ToolId = "json-validator",
            ExecutedAtUtc = DateTime.UtcNow,
            Success = false,
            DurationMs = 20,
            PayloadSize = 10,
            ExecutionMode = "Sandbox",
            RuntimeLanguage = "python",
            AdapterName = "PythonExecutionAdapter",
            AdapterResolutionStatus = "resolved",
            Capability = "validate",
            Authority = "UnifiedAuthoritative",
            CorrelationId = "corr-pg",
            TenantId = "tenant-pg",
            TraceId = "trace-pg",
            Snapshot = new ExecutionSnapshotEntity { Id = Guid.NewGuid(), SnapshotId = "snap-pg", Authority = "UnifiedAuthoritative", RuntimeLanguage = "python", ExecutionCapability = "validate", TimestampUtc = DateTime.UtcNow, ConformanceVersion = "v1", GovernanceDecisionId = decisionId },
            Conformance = new ExecutionConformanceResultEntity { Id = Guid.NewGuid(), IsValid = false, NormalizedStatus = "failed", WasNormalized = true, IssueCount = 1, IssuesJson = "[\"invalid\"]" },
            AuthorityDecision = new ExecutionAuthorityDecisionEntity { Id = Guid.NewGuid(), Authority = "UnifiedAuthoritative", AdmissionAllowed = true, AdmissionReason = "Allowed", DecisionSource = "admission-controller" }
        };

        context.ExecutionRuns.Add(run);
        await context.SaveChangesAsync();

        var exists = await context.ExecutionRuns.AsNoTracking().AnyAsync(x => x.CorrelationId == "corr-pg");
        Assert.True(exists);
    }
}
