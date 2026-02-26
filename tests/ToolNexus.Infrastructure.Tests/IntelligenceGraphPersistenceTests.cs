using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class IntelligenceGraphPersistenceTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task IntelligenceGraphEntities_CanPersistAndRelate(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        var sourceNodeId = Guid.NewGuid();
        var targetNodeId = Guid.NewGuid();
        var snapshotId = Guid.NewGuid();

        await using (var context = database.CreateContext())
        {
            context.IntelligenceNodes.AddRange(
                new IntelligenceNodeEntity
                {
                    NodeId = sourceNodeId,
                    NodeType = "TOOL",
                    ExternalRef = "tool:json-transform",
                    DisplayName = "Json Transform",
                    LifecycleState = "active",
                    LifecycleVersion = "v1",
                    ConfidenceBand = "measured",
                    CorrelationId = "corr-1",
                    TenantId = "tenant-a",
                    ContextTagsJson = "[\"runtime:auto\"]",
                    PropertiesJson = "{\"runtimeLanguage\":\"dotnet\"}",
                    ObservedAtUtc = DateTime.UtcNow,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new IntelligenceNodeEntity
                {
                    NodeId = targetNodeId,
                    NodeType = "CAPABILITY",
                    ExternalRef = "capability:json-transform",
                    DisplayName = "JSON Transform",
                    LifecycleState = "active",
                    LifecycleVersion = "v1",
                    ConfidenceBand = "measured",
                    CorrelationId = "corr-1",
                    TenantId = "tenant-a",
                    ContextTagsJson = "[\"risk:low\"]",
                    PropertiesJson = "{\"maturityLevel\":\"stable\"}",
                    ObservedAtUtc = DateTime.UtcNow,
                    CreatedAtUtc = DateTime.UtcNow
                });

            context.IntelligenceEdges.Add(new IntelligenceEdgeEntity
            {
                EdgeId = Guid.NewGuid(),
                SourceNodeId = sourceNodeId,
                TargetNodeId = targetNodeId,
                RelationshipType = "GENERATES",
                LifecycleVersion = "v1",
                ConfidenceScore = 0.94m,
                CorrelationId = "corr-1",
                TenantId = "tenant-a",
                ContextTagsJson = "[\"path:tool-capability\"]",
                MetadataJson = "{\"source\":\"test\"}",
                EffectiveAtUtc = DateTime.UtcNow,
                RecordedAtUtc = DateTime.UtcNow
            });

            context.IntelligenceSnapshots.Add(new IntelligenceSnapshotEntity
            {
                SnapshotId = snapshotId,
                SnapshotType = "materialized",
                LifecycleVersion = "v1",
                CorrelationId = "corr-1",
                TenantId = "tenant-a",
                SnapshotAtUtc = DateTime.UtcNow,
                NodeCountByTypeJson = "{\"TOOL\":1,\"CAPABILITY\":1}",
                EdgeCountByTypeJson = "{\"GENERATES\":1}",
                IntegrityStatus = "consistent",
                Notes = "phase-1-check",
                CreatedAtUtc = DateTime.UtcNow
            });

            await context.SaveChangesAsync();
        }

        await using (var verification = database.CreateContext())
        {
            var nodeCount = await verification.IntelligenceNodes.CountAsync();
            var edgeCount = await verification.IntelligenceEdges.CountAsync();
            var snapshotCount = await verification.IntelligenceSnapshots.CountAsync();

            Assert.Equal(2, nodeCount);
            Assert.Equal(1, edgeCount);
            Assert.Equal(1, snapshotCount);
            Assert.True(await verification.IntelligenceEdges.AnyAsync(x => x.SourceNodeId == sourceNodeId && x.TargetNodeId == targetNodeId));
            Assert.True(await verification.IntelligenceSnapshots.AnyAsync(x => x.SnapshotId == snapshotId && x.IntegrityStatus == "consistent"));
        }
    }
}
