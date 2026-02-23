using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Infrastructure.Content;
using ToolNexus.Infrastructure.Content.Entities;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class EfAdminAuditLogRepositoryTests
{
    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task QueryAsync_FiltersAndPagesAcrossProviders(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        var matchingId = Guid.NewGuid();

        await using (var seedContext = database.CreateContext())
        {
            seedContext.AuditEvents.AddRange(
                new AuditEventEntity
                {
                    Id = matchingId,
                    OccurredAtUtc = new DateTime(2026, 2, 14, 9, 0, 0, DateTimeKind.Utc),
                    ActorType = "user",
                    ActorId = "admin.user",
                    Action = "tool.updated",
                    TargetType = "tool",
                    TargetId = "tool-1",
                    ResultStatus = "partial",
                    TraceId = "trace-abc",
                    RequestId = "request-xyz",
                    PayloadRedacted = """
                    {
                      "_redaction_meta": { "fields_redacted_count": 2 },
                      "_truncation_meta": { "applied": true, "bytes_original": 2800, "bytes_final": 2048 }
                    }
                    """
                },
                new AuditEventEntity
                {
                    Id = Guid.NewGuid(),
                    OccurredAtUtc = new DateTime(2026, 2, 14, 8, 0, 0, DateTimeKind.Utc),
                    ActorType = "user",
                    ActorId = "viewer.user",
                    Action = "tool.viewed",
                    TargetType = "tool",
                    TargetId = "tool-2",
                    ResultStatus = "success",
                    TraceId = "trace-def",
                    RequestId = "request-def",
                    PayloadRedacted = "{}"
                });

            await seedContext.SaveChangesAsync();
        }

        await using var readContext = database.CreateContext();
        var repository = new EfAdminAuditLogRepository(readContext, NullLogger<EfAdminAuditLogRepository>.Instance);

        var result = await repository.QueryAsync(
            new ChangeHistoryQuery(
                Page: 1,
                PageSize: 10,
                Search: "updated",
                ActionType: "tool.updated",
                EntityType: "tool",
                Actor: "admin",
                Severity: "warning",
                FromUtc: new DateTime(2026, 2, 14, 0, 0, 0, DateTimeKind.Utc),
                ToUtc: new DateTime(2026, 2, 14, 23, 59, 59, DateTimeKind.Utc),
                CorrelationId: "trace-abc"),
            CancellationToken.None);

        var item = Assert.Single(result.Items);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(matchingId, item.Id);
        Assert.Equal("warning", item.Severity);
        Assert.True(item.RedactionApplied);
        Assert.True(item.TruncationApplied);
        Assert.Equal(2800, item.PayloadBytesOriginal);
        Assert.Equal(2048, item.PayloadBytesFinal);
    }

    [Theory]
    [ClassData(typeof(ProviderTheoryData))]
    public async Task GetPayloadDetailAsync_ReturnsPayloadMetadataAcrossProviders(TestDatabaseProvider provider)
    {
        await using var database = await TestDatabaseInstance.CreateAsync(provider);
        var eventId = Guid.NewGuid();

        await using (var seedContext = database.CreateContext())
        {
            seedContext.AuditEvents.Add(new AuditEventEntity
            {
                Id = eventId,
                OccurredAtUtc = DateTime.UtcNow,
                ActorType = "service",
                Action = "system.sync",
                ResultStatus = "failure",
                PayloadRedacted = """
                {
                  "_redaction_meta": { "fields_redacted_count": 1 },
                  "_truncation_meta": { "applied": false, "bytes_original": 100, "bytes_final": 100 }
                }
                """
            });

            await seedContext.SaveChangesAsync();
        }

        await using var readContext = database.CreateContext();
        var repository = new EfAdminAuditLogRepository(readContext, NullLogger<EfAdminAuditLogRepository>.Instance);

        var detail = await repository.GetPayloadDetailAsync(eventId, CancellationToken.None);

        Assert.NotNull(detail);
        Assert.Equal(eventId, detail!.Id);
        Assert.Contains("fields_redacted_count", detail.PayloadJson);
        Assert.True(detail.RedactionApplied);
        Assert.False(detail.TruncationApplied);
        Assert.Equal(100, detail.PayloadBytesOriginal);
        Assert.Equal(100, detail.PayloadBytesFinal);
    }
}
