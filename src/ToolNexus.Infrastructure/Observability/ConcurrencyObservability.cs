using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Observability;

public sealed class ConcurrencyObservability : IConcurrencyObservability
{
    public const string MeterName = "ToolNexus.Concurrency";
    private static readonly TimeSpan Window = TimeSpan.FromHours(24);

    private readonly Meter _meter = new(MeterName);
    private readonly Counter<long> _conflicts;
    private readonly Histogram<double> _conflictRatePerResource;
    private readonly Counter<long> _missingTokens;
    private readonly Counter<long> _resolutionActions;
    private readonly Counter<long> _staleUpdates;

    private readonly ConcurrentQueue<(DateTime TimestampUtc, string ResourceType)> _conflictEvents = new();
    private readonly ConcurrentDictionary<string, long> _attempts = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, long> _resourceConflicts = new(StringComparer.OrdinalIgnoreCase);

    public ConcurrencyObservability()
    {
        _conflicts = _meter.CreateCounter<long>("concurrency_conflict_total", description: "Total optimistic concurrency conflicts.");
        _conflictRatePerResource = _meter.CreateHistogram<double>("conflict_rate_per_resource", unit: "%", description: "Conflict rate percentage by resource type.");
        _missingTokens = _meter.CreateCounter<long>("missing_version_token_total", description: "Writes attempted without version token.");
        _resolutionActions = _meter.CreateCounter<long>("conflict_resolution_action_total", description: "Conflict resolution actions selected by operators.");
        _staleUpdates = _meter.CreateCounter<long>("stale_update_attempt_total", description: "Stale update attempts rejected due to outdated token.");
    }

    public void RecordWriteAttempt(string resourceType)
    {
        var attempts = _attempts.AddOrUpdate(resourceType, 1, (_, current) => current + 1);
        var conflicts = _resourceConflicts.TryGetValue(resourceType, out var count) ? count : 0;
        var rate = attempts == 0 ? 0d : conflicts * 100d / attempts;
        _conflictRatePerResource.Record(rate, new KeyValuePair<string, object?>("resource_type", resourceType));
    }

    public void RecordMissingVersionToken(string resourceType)
        => _missingTokens.Add(1, new KeyValuePair<string, object?>("resource_type", resourceType));

    public void RecordConflict(string resourceType, string? clientVersionToken, string? serverVersionToken)
    {
        _conflicts.Add(1,
            new KeyValuePair<string, object?>("resource_type", resourceType),
            new KeyValuePair<string, object?>("client_token_present", !string.IsNullOrWhiteSpace(clientVersionToken)),
            new KeyValuePair<string, object?>("server_token_present", !string.IsNullOrWhiteSpace(serverVersionToken)));
        _resourceConflicts.AddOrUpdate(resourceType, 1, (_, current) => current + 1);
        _conflictEvents.Enqueue((DateTime.UtcNow, resourceType));
        TrimOldEvents(DateTime.UtcNow);
    }

    public void RecordResolutionAction(string resourceType, string action)
        => _resolutionActions.Add(1,
            new KeyValuePair<string, object?>("resource_type", resourceType),
            new KeyValuePair<string, object?>("action", action));

    public void RecordStaleUpdateAttempt(string resourceType)
        => _staleUpdates.Add(1, new KeyValuePair<string, object?>("resource_type", resourceType));

    public ConcurrencyHealthSnapshot GetHealthSnapshot()
    {
        var now = DateTime.UtcNow;
        TrimOldEvents(now);
        var events = _conflictEvents.ToArray();

        var trend = Enumerable.Range(0, 24)
            .Select(offset => now.AddHours(-(23 - offset)))
            .Select(hour =>
            {
                var start = new DateTime(hour.Year, hour.Month, hour.Day, hour.Hour, 0, 0, DateTimeKind.Utc);
                var end = start.AddHours(1);
                var count = events.LongCount(x => x.TimestampUtc >= start && x.TimestampUtc < end);
                return new ConcurrencyTrendPoint(start, count);
            })
            .ToArray();

        var top = events.GroupBy(x => x.ResourceType, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var attempts = _attempts.TryGetValue(g.Key, out var value) ? value : 0;
                var rate = attempts == 0 ? 0d : g.LongCount() * 100d / attempts;
                return new ConcurrencyResourceConflictPoint(g.Key, g.LongCount(), rate);
            })
            .OrderByDescending(x => x.Conflicts)
            .Take(5)
            .ToArray();

        var alerts = BuildAlerts(events, top);
        return new ConcurrencyHealthSnapshot(events.LongLength, trend, top, alerts);
    }

    private static IReadOnlyList<ConcurrencyAlertSnapshot> BuildAlerts((DateTime TimestampUtc, string ResourceType)[] events, IReadOnlyList<ConcurrencyResourceConflictPoint> top)
    {
        var now = DateTime.UtcNow;
        var conflictsLastHour = events.LongCount(x => x.TimestampUtc >= now.AddHours(-1));
        var conflictsPrevHour = events.LongCount(x => x.TimestampUtc < now.AddHours(-1) && x.TimestampUtc >= now.AddHours(-2));
        var alerts = new List<ConcurrencyAlertSnapshot>();

        if (conflictsLastHour >= 20 && conflictsLastHour >= (conflictsPrevHour * 2))
        {
            alerts.Add(new("conflict_spike", "Warning", "Conflict volume doubled within the last hour.", "all", conflictsLastHour, Math.Max(20, conflictsPrevHour * 2)));
        }

        foreach (var resource in top.Where(x => x.ConflictRatePercent >= 15d))
        {
            alerts.Add(new("conflict_loop", "Warning", "Resource has repeated conflict loops.", resource.ResourceType, resource.ConflictRatePercent, 15d));
        }

        return alerts;
    }

    private void TrimOldEvents(DateTime now)
    {
        while (_conflictEvents.TryPeek(out var item) && now - item.TimestampUtc > Window)
        {
            _conflictEvents.TryDequeue(out _);
        }
    }
}
