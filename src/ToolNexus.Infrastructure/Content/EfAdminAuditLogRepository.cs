using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
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
            var baseSql = @"
FROM audit_events
WHERE (@actionType IS NULL OR action = @actionType)
  AND (@entityType IS NULL OR target_type = @entityType)
  AND (@actor IS NULL OR actor_id ILIKE @actorLike)
  AND (@severity IS NULL OR
      CASE
        WHEN result_status = 'failure' THEN 'critical'
        WHEN result_status = 'partial' THEN 'warning'
        ELSE 'info'
      END = @severity)
  AND (@fromUtc IS NULL OR occurred_at_utc >= @fromUtc)
  AND (@toUtc IS NULL OR occurred_at_utc <= @toUtc)
  AND (@correlationId IS NULL OR trace_id = @correlationId OR request_id = @correlationId)
  AND (@search IS NULL OR
        action ILIKE @searchLike OR
        COALESCE(target_type, '') ILIKE @searchLike OR
        COALESCE(target_id, '') ILIKE @searchLike OR
        COALESCE(actor_id, '') ILIKE @searchLike OR
        COALESCE(trace_id, '') ILIKE @searchLike OR
        COALESCE(request_id, '') ILIKE @searchLike)
";

            var parameters = BuildParameters(query);

            var countSql = $"SELECT COUNT(*) {baseSql}";
            var totalRaw = await dbContext.Database.SqlQueryRaw<long>(countSql, parameters).SingleAsync(cancellationToken);
            var total = checked((int)Math.Min(int.MaxValue, totalRaw));

            var skip = (query.Page - 1) * query.PageSize;

            var itemsSql = $@"
SELECT
  id AS ""Id"",
  occurred_at_utc AS ""OccurredAtUtc"",
  COALESCE(actor_id, actor_type, 'system') AS ""Actor"",
  action AS ""Action"",
  COALESCE(target_type, '') AS ""EntityType"",
  COALESCE(target_id, '') AS ""EntityId"",
  CASE
    WHEN result_status = 'failure' THEN 'critical'
    WHEN result_status = 'partial' THEN 'warning'
    ELSE 'info'
  END AS ""Severity"",
  trace_id AS ""TraceId"",
  request_id AS ""RequestId"",
  (payload_redacted -> '_redaction_meta' ->> 'fields_redacted_count')::int > 0 AS ""RedactionApplied"",
  COALESCE((payload_redacted -> '_truncation_meta' ->> 'applied')::boolean, false) AS ""TruncationApplied"",
  (payload_redacted -> '_truncation_meta' ->> 'bytes_original')::int AS ""PayloadBytesOriginal"",
  (payload_redacted -> '_truncation_meta' ->> 'bytes_final')::int AS ""PayloadBytesFinal""
{baseSql}
ORDER BY occurred_at_utc DESC
OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";

            var pageParams = parameters
                .Append(new NpgsqlParameter("offset", NpgsqlDbType.Integer) { Value = skip })
                .Append(new NpgsqlParameter("limit", NpgsqlDbType.Integer) { Value = query.PageSize })
                .ToArray();

            var rows = await dbContext.Database.SqlQueryRaw<ChangeHistoryRow>(itemsSql, pageParams).ToListAsync(cancellationToken);
            var items = rows.Select(MapRow).ToList();
            return new ChangeHistoryPage(query.Page, query.PageSize, total, items, skip + items.Count < total);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            logger.LogWarning(ex, "Audit events table is missing. Returning empty change-history page.");
            return new ChangeHistoryPage(query.Page, query.PageSize, 0, [], false);
        }
    }

    public async Task<ChangeHistoryPayloadDetail?> GetPayloadDetailAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            const string sql = @"
SELECT
  id AS ""Id"",
  payload_redacted::text AS ""PayloadJson"",
  (payload_redacted -> '_redaction_meta' ->> 'fields_redacted_count')::int > 0 AS ""RedactionApplied"",
  COALESCE((payload_redacted -> '_truncation_meta' ->> 'applied')::boolean, false) AS ""TruncationApplied"",
  (payload_redacted -> '_truncation_meta' ->> 'bytes_original')::int AS ""PayloadBytesOriginal"",
  (payload_redacted -> '_truncation_meta' ->> 'bytes_final')::int AS ""PayloadBytesFinal""
FROM audit_events
WHERE id = @id";

            var row = await dbContext.Database.SqlQueryRaw<ChangeHistoryPayloadRow>(
                sql,
                new NpgsqlParameter("id", NpgsqlDbType.Uuid) { Value = id })
                .SingleOrDefaultAsync(cancellationToken);

            if (row is null)
            {
                return null;
            }

            return new ChangeHistoryPayloadDetail(
                row.Id,
                row.PayloadJson,
                row.RedactionApplied,
                row.TruncationApplied,
                row.PayloadBytesOriginal,
                row.PayloadBytesFinal);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            logger.LogWarning(ex, "Audit events table is missing. Payload lookup returned no record.");
            return null;
        }
    }

    private static NpgsqlParameter[] BuildParameters(ChangeHistoryQuery query)
    {
        string? EmptyToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        var actionType = EmptyToNull(query.ActionType);
        var entityType = EmptyToNull(query.EntityType);
        var actor = EmptyToNull(query.Actor);
        var severity = EmptyToNull(query.Severity)?.ToLowerInvariant();
        var correlationId = EmptyToNull(query.CorrelationId);
        var search = EmptyToNull(query.Search);

        return
        [
            new NpgsqlParameter("actionType", NpgsqlDbType.Text) { Value = (object?)actionType ?? DBNull.Value },
            new NpgsqlParameter("entityType", NpgsqlDbType.Text) { Value = (object?)entityType ?? DBNull.Value },
            new NpgsqlParameter("actor", NpgsqlDbType.Text) { Value = (object?)actor ?? DBNull.Value },
            new NpgsqlParameter("actorLike", NpgsqlDbType.Text) { Value = (object?)WrapLike(actor) ?? DBNull.Value },
            new NpgsqlParameter("severity", NpgsqlDbType.Text) { Value = (object?)severity ?? DBNull.Value },
            new NpgsqlParameter("fromUtc", NpgsqlDbType.TimestampTz) { Value = (object?)query.FromUtc ?? DBNull.Value },
            new NpgsqlParameter("toUtc", NpgsqlDbType.TimestampTz) { Value = (object?)query.ToUtc ?? DBNull.Value },
            new NpgsqlParameter("correlationId", NpgsqlDbType.Text) { Value = (object?)correlationId ?? DBNull.Value },
            new NpgsqlParameter("search", NpgsqlDbType.Text) { Value = (object?)search ?? DBNull.Value },
            new NpgsqlParameter("searchLike", NpgsqlDbType.Text) { Value = (object?)WrapLike(search) ?? DBNull.Value }
        ];
    }

    private static string? WrapLike(string? value) => string.IsNullOrWhiteSpace(value) ? null : $"%{value}%";

    private static ChangeHistoryItem MapRow(ChangeHistoryRow row)
    {
        var badge = row.TruncationApplied ? "[TRUNCATED]" : row.RedactionApplied ? "[REDACTED]" : "[SAFE]";
        var summary = string.Join(' ', [row.Action, row.EntityType, row.EntityId]).Trim();
        if (summary.Length > 110)
        {
            summary = summary[..110] + "…";
        }

        return new ChangeHistoryItem(
            row.Id,
            row.OccurredAtUtc,
            row.Actor,
            row.Action,
            row.EntityType,
            row.EntityId,
            row.Severity,
            row.TraceId,
            row.RequestId,
            row.RedactionApplied,
            row.TruncationApplied,
            row.PayloadBytesOriginal,
            row.PayloadBytesFinal,
            $"{badge} {summary}");
    }

    private sealed class ChangeHistoryRow
    {
        public Guid Id { get; init; }
        public DateTime OccurredAtUtc { get; init; }
        public string Actor { get; init; } = string.Empty;
        public string Action { get; init; } = string.Empty;
        public string EntityType { get; init; } = string.Empty;
        public string EntityId { get; init; } = string.Empty;
        public string Severity { get; init; } = string.Empty;
        public string? TraceId { get; init; }
        public string? RequestId { get; init; }
        public bool RedactionApplied { get; init; }
        public bool TruncationApplied { get; init; }
        public int? PayloadBytesOriginal { get; init; }
        public int? PayloadBytesFinal { get; init; }
    }

    private sealed class ChangeHistoryPayloadRow
    {
        public Guid Id { get; init; }
        public string PayloadJson { get; init; } = JsonSerializer.Serialize(new { });
        public bool RedactionApplied { get; init; }
        public bool TruncationApplied { get; init; }
        public int? PayloadBytesOriginal { get; init; }
        public int? PayloadBytesFinal { get; init; }
    }
}
