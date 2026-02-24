namespace ToolNexus.Application.Models;

public sealed record RuntimeIncidentIngestRequest(
    string ToolSlug,
    string Phase,
    string ErrorType,
    string Message,
    string? Stack,
    string PayloadType,
    DateTime Timestamp,
    int Count,
    string? Fingerprint,
    string? CorrelationId = null);

public sealed record RuntimeIncidentIngestBatch(IReadOnlyList<RuntimeIncidentIngestRequest> Incidents);

public sealed record ClientIncidentLogRequest(
    string Source,
    string Level,
    string Message,
    string? Stack,
    string? ToolSlug,
    string? CorrelationId,
    DateTime Timestamp,
    IReadOnlyDictionary<string, object?>? Metadata);

public sealed record ClientIncidentLogBatch(IReadOnlyList<ClientIncidentLogRequest> Logs);

public sealed record RuntimeIncidentSummary(
    string ToolSlug,
    string Message,
    string Severity,
    int Count,
    DateTime LastOccurrenceUtc);

public sealed record RuntimeToolHealthSnapshot(
    string Slug,
    int HealthScore,
    int IncidentCount,
    DateTime? LastIncidentUtc,
    string DominantError);
