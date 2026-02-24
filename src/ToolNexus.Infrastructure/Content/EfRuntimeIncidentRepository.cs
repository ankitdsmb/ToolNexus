using System.Text.Json;
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
                dbContext.RuntimeIncidents.Add(new RuntimeIncidentEntity
                {
                    Fingerprint = fingerprint,
                    ToolSlug = incident.ToolSlug,
                    Phase = incident.Phase,
                    ErrorType = incident.ErrorType,
                    Message = incident.Message,
                    Stack = BuildStoredStack(incident.Stack, incident.Metadata),
                    CorrelationId = incident.CorrelationId,
                    PayloadType = incident.PayloadType,
                    Severity = incident.Severity,
                    Count = incident.Count,
                    FirstOccurredUtc = timestamp,
                    LastOccurredUtc = timestamp
                });
            }
            else
            {
                existing.LastOccurredUtc = timestamp;
                existing.Count += incident.Count;
                if (!string.IsNullOrWhiteSpace(incident.Stack) || incident.Metadata is not null)
                {
                    existing.Stack = BuildStoredStack(incident.Stack, incident.Metadata);
                }

                if (!string.IsNullOrWhiteSpace(incident.CorrelationId))
                {
                    existing.CorrelationId = incident.CorrelationId;
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

    public async Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
    {
        return await ExecuteWithSchemaRecoveryAsync(async () =>
        {
            var incidents = await dbContext.RuntimeIncidents
                .AsNoTracking()
                .Select(x => new
                {
                    x.ToolSlug,
                    x.Severity,
                    x.Count,
                    x.LastOccurredUtc,
                    x.Message
                })
                .ToListAsync(cancellationToken);

            var snapshots = incidents
                .GroupBy(x => x.ToolSlug)
                .Select(group =>
                {
                    var incidentCount = group.Sum(item => item.Count);
                    var weightedIncidentCount = group.Sum(item => item.Count * ToSeverityWeight(item.Severity));
                    var healthScore = Math.Max(0, 100 - weightedIncidentCount);

                    var dominantError = group
                        .GroupBy(item => item.Message)
                        .OrderByDescending(item => item.Sum(x => x.Count))
                        .ThenByDescending(item => item.Max(x => x.LastOccurredUtc))
                        .Select(item => item.Key)
                        .FirstOrDefault() ?? "unknown";

                    return new RuntimeToolHealthSnapshot(
                        group.Key,
                        healthScore,
                        incidentCount,
                        group.Max(item => item.LastOccurredUtc),
                        dominantError);
                })
                .OrderBy(x => x.HealthScore)
                .ThenByDescending(x => x.IncidentCount)
                .ThenBy(x => x.Slug)
                .ToList();

            return (IReadOnlyList<RuntimeToolHealthSnapshot>)snapshots;
        }, cancellationToken);
    }

    private static string BuildFingerprint(RuntimeIncidentIngestRequest incident)
        => string.Join("::", incident.ToolSlug, incident.Phase, incident.ErrorType, incident.Message, incident.PayloadType);

    private static string? BuildStoredStack(string? stack, IReadOnlyDictionary<string, object?>? metadata)
    {
        var normalizedStack = string.IsNullOrWhiteSpace(stack) ? null : stack;
        if (metadata is null)
        {
            return normalizedStack;
        }

        var serializedMetadata = JsonSerializer.Serialize(metadata);
        return string.IsNullOrWhiteSpace(normalizedStack)
            ? $"metadata:{serializedMetadata}"
            : $"{normalizedStack}{Environment.NewLine}metadata:{serializedMetadata}";
    }

    private static int ToSeverityWeight(string severity)
        => string.Equals(severity, "critical", StringComparison.OrdinalIgnoreCase) ? 12 : 5;

    private async Task<T> ExecuteWithSchemaRecoveryAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (PostgresException ex) when (ex.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn)
        {
            await RecoverSchemaAsync(cancellationToken);
            return await action();
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 1
                                         && (ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase)
                                             || ex.Message.Contains("no such column", StringComparison.OrdinalIgnoreCase)))
        {
            await RecoverSchemaAsync(cancellationToken);
            return await action();
        }
    }

    private static Task RecoverSchemaAsync(CancellationToken cancellationToken)
        => Task.CompletedTask;
}
