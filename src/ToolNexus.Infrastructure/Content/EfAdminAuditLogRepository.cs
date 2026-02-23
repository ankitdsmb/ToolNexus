using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminAuditLogRepository(
    ToolNexusContentDbContext dbContext,
    ILogger<EfAdminAuditLogRepository> logger) : IAdminAuditLogRepository
{
    public async Task<ChangeHistoryPage> QueryAsync(ChangeHistoryQuery query, CancellationToken cancellationToken = default)
    {
        try
        {
            var normalized = NormalizeQuery(query);

            var filteredQuery = BuildFilteredQuery(normalized);
            var total = await filteredQuery.CountAsync(cancellationToken);

            var skip = (query.Page - 1) * query.PageSize;

            var events = await filteredQuery
                .OrderByDescending(x => x.OccurredAtUtc)
                .Skip(skip)
                .Take(query.PageSize)
                .ToListAsync(cancellationToken);

            var items = events.Select(MapEvent).ToList();
            return new ChangeHistoryPage(query.Page, query.PageSize, total, items, skip + items.Count < total);
        }
        catch (Exception ex) when (IsMissingAuditEventsTable(ex))
        {
            logger.LogWarning(ex, "Audit events table is missing. Returning empty change-history page.");
            return new ChangeHistoryPage(query.Page, query.PageSize, 0, [], false);
        }
    }

    public async Task<ChangeHistoryPayloadDetail?> GetPayloadDetailAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var auditEvent = await dbContext.AuditEvents
                .AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

            if (auditEvent is null)
            {
                return null;
            }

            var payloadMeta = ParsePayloadMeta(auditEvent.PayloadRedacted);

            return new ChangeHistoryPayloadDetail(
                auditEvent.Id,
                auditEvent.PayloadRedacted,
                payloadMeta.RedactionApplied,
                payloadMeta.TruncationApplied,
                payloadMeta.PayloadBytesOriginal,
                payloadMeta.PayloadBytesFinal);
        }
        catch (Exception ex) when (IsMissingAuditEventsTable(ex))
        {
            logger.LogWarning(ex, "Audit events table is missing. Payload lookup returned no record.");
            return null;
        }
    }

    private IQueryable<AuditEventEntity> BuildFilteredQuery(NormalizedChangeHistoryQuery query)
    {
        var filtered = dbContext.AuditEvents.AsNoTracking();

        if (query.ActionType is not null)
        {
            filtered = filtered.Where(x => x.Action == query.ActionType);
        }

        if (query.EntityType is not null)
        {
            filtered = filtered.Where(x => x.TargetType == query.EntityType);
        }

        if (query.ActorLike is not null)
        {
            filtered = filtered.Where(x => x.ActorId != null && EF.Functions.Like(x.ActorId.ToLower(), query.ActorLike));
        }

        if (query.Severity is not null)
        {
            filtered = filtered.Where(x =>
                (x.ResultStatus == "failure" ? "critical" : x.ResultStatus == "partial" ? "warning" : "info") == query.Severity);
        }

        if (query.FromUtc is not null)
        {
            filtered = filtered.Where(x => x.OccurredAtUtc >= query.FromUtc.Value);
        }

        if (query.ToUtc is not null)
        {
            filtered = filtered.Where(x => x.OccurredAtUtc <= query.ToUtc.Value);
        }

        if (query.CorrelationId is not null)
        {
            filtered = filtered.Where(x => x.TraceId == query.CorrelationId || x.RequestId == query.CorrelationId);
        }

        if (query.SearchLike is not null)
        {
            filtered = filtered.Where(x =>
                EF.Functions.Like(x.Action.ToLower(), query.SearchLike)
                || (x.TargetType != null && EF.Functions.Like(x.TargetType.ToLower(), query.SearchLike))
                || (x.TargetId != null && EF.Functions.Like(x.TargetId.ToLower(), query.SearchLike))
                || (x.ActorId != null && EF.Functions.Like(x.ActorId.ToLower(), query.SearchLike))
                || (x.TraceId != null && EF.Functions.Like(x.TraceId.ToLower(), query.SearchLike))
                || (x.RequestId != null && EF.Functions.Like(x.RequestId.ToLower(), query.SearchLike)));
        }

        return filtered;
    }

    private static string ResolveSeverity(string resultStatus) => resultStatus switch
    {
        "failure" => "critical",
        "partial" => "warning",
        _ => "info"
    };

    private static ChangeHistoryItem MapEvent(AuditEventEntity row)
    {
        var payloadMeta = ParsePayloadMeta(row.PayloadRedacted);
        var badge = payloadMeta.TruncationApplied ? "[TRUNCATED]" : payloadMeta.RedactionApplied ? "[REDACTED]" : "[SAFE]";
        var summary = string.Join(' ', [row.Action, row.TargetType ?? string.Empty, row.TargetId ?? string.Empty]).Trim();
        if (summary.Length > 110)
        {
            summary = summary[..110] + "…";
        }

        return new ChangeHistoryItem(
            row.Id,
            row.OccurredAtUtc,
            row.ActorId ?? row.ActorType,
            row.Action,
            row.TargetType ?? string.Empty,
            row.TargetId ?? string.Empty,
            ResolveSeverity(row.ResultStatus),
            row.TraceId,
            row.RequestId,
            payloadMeta.RedactionApplied,
            payloadMeta.TruncationApplied,
            payloadMeta.PayloadBytesOriginal,
            payloadMeta.PayloadBytesFinal,
            $"{badge} {summary}");
    }

    private static NormalizedChangeHistoryQuery NormalizeQuery(ChangeHistoryQuery query)
    {
        static string? EmptyToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        var actor = EmptyToNull(query.Actor);
        var search = EmptyToNull(query.Search);
        return new NormalizedChangeHistoryQuery(
            EmptyToNull(query.ActionType),
            EmptyToNull(query.EntityType),
            WrapLike(actor),
            EmptyToNull(query.Severity)?.ToLowerInvariant(),
            query.FromUtc,
            query.ToUtc,
            EmptyToNull(query.CorrelationId),
            WrapLike(search));
    }

    private static string? WrapLike(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : $"%{value.Trim().ToLowerInvariant()}%";

    private static PayloadMeta ParsePayloadMeta(string payloadJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            var root = doc.RootElement;

            var redactionApplied = root.TryGetProperty("_redaction_meta", out var redactionMeta)
                && redactionMeta.TryGetProperty("fields_redacted_count", out var redactedCount)
                && redactedCount.ValueKind == JsonValueKind.Number
                && redactedCount.GetInt32() > 0;

            var truncationApplied = root.TryGetProperty("_truncation_meta", out var truncationMeta)
                && truncationMeta.TryGetProperty("applied", out var appliedElement)
                && appliedElement.ValueKind is JsonValueKind.True or JsonValueKind.False
                && appliedElement.GetBoolean();

            var payloadBytesOriginal = TryReadInt(root, "_truncation_meta", "bytes_original");
            var payloadBytesFinal = TryReadInt(root, "_truncation_meta", "bytes_final");

            return new PayloadMeta(redactionApplied, truncationApplied, payloadBytesOriginal, payloadBytesFinal);
        }
        catch (JsonException)
        {
            return new PayloadMeta(false, false, null, null);
        }
    }

    private static int? TryReadInt(JsonElement root, string parentProperty, string valueProperty)
    {
        if (!root.TryGetProperty(parentProperty, out var parent)
            || !parent.TryGetProperty(valueProperty, out var value)
            || value.ValueKind != JsonValueKind.Number)
        {
            return null;
        }

        return value.GetInt32();
    }

    private static bool IsMissingAuditEventsTable(Exception ex)
    {
        for (Exception? current = ex; current is not null; current = current.InnerException)
        {
            if (current.Message.Contains("audit_events", StringComparison.OrdinalIgnoreCase)
                && (current.Message.Contains("does not exist", StringComparison.OrdinalIgnoreCase)
                    || current.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase)
                    || current.Message.Contains("undefined table", StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }
        }

        return false;
    }

    private sealed record NormalizedChangeHistoryQuery(
        string? ActionType,
        string? EntityType,
        string? ActorLike,
        string? Severity,
        DateTime? FromUtc,
        DateTime? ToUtc,
        string? CorrelationId,
        string? SearchLike);

    private sealed record PayloadMeta(
        bool RedactionApplied,
        bool TruncationApplied,
        int? PayloadBytesOriginal,
        int? PayloadBytesFinal);
}
