using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfRuntimeIncidentRepository(ToolNexusContentDbContext dbContext) : IRuntimeIncidentRepository
{
    public async Task UpsertAsync(RuntimeIncidentIngestRequest incident, CancellationToken cancellationToken)
    {
        await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var timestamp = incident.Timestamp == default ? DateTime.UtcNow : incident.Timestamp;
            var fingerprint = string.IsNullOrWhiteSpace(incident.Fingerprint)
                ? BuildFingerprint(incident)
                : incident.Fingerprint!.Trim();

            var existing = await dbContext.RuntimeIncidents.FirstOrDefaultAsync(x => x.Fingerprint == fingerprint, cancellationToken);
            if (existing is null)
            {
                var severity = ToSeverity(incident.ErrorType);
                dbContext.RuntimeIncidents.Add(new RuntimeIncidentEntity
                {
                    Fingerprint = fingerprint,
                    ToolSlug = incident.ToolSlug,
                    Phase = incident.Phase,
                    ErrorType = incident.ErrorType,
                    Message = incident.Message,
                    Stack = incident.Stack,
                    PayloadType = incident.PayloadType,
                    Severity = severity,
                    Count = incident.Count,
                    FirstOccurredUtc = timestamp,
                    LastOccurredUtc = timestamp
                });
            }
            else
            {
                existing.LastOccurredUtc = timestamp;
                existing.Count += incident.Count;
                if (!string.IsNullOrWhiteSpace(incident.Stack))
                {
                    existing.Stack = incident.Stack;
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            return 0;
        }, cancellationToken);
    }

    public async Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
    {
        return await ExecuteWithSchemaRecoveryAsync(async () =>
            await dbContext.RuntimeIncidents
                .AsNoTracking()
                .OrderByDescending(x => x.LastOccurredUtc)
                .Take(take)
                .Select(x => new RuntimeIncidentSummary(x.ToolSlug, x.Message, x.Severity, x.Count, x.LastOccurredUtc))
                .ToListAsync(cancellationToken), cancellationToken);
    }

    private static string BuildFingerprint(RuntimeIncidentIngestRequest incident)
        => string.Join("::", incident.ToolSlug, incident.Phase, incident.ErrorType, incident.Message, incident.PayloadType);

    private static string ToSeverity(string errorType)
        => string.Equals(errorType, "contract_violation", StringComparison.OrdinalIgnoreCase) ? "warning" : "critical";

    private async Task<T> ExecuteWithSchemaRecoveryAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn)
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
            return await action();
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 1
                                         && (ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase)
                                             || ex.Message.Contains("no such column", StringComparison.OrdinalIgnoreCase)))
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
            return await action();
        }
    }
}
