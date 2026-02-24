using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class RuntimeIncidentService(IRuntimeIncidentRepository repository) : IRuntimeIncidentService
{
    public async Task IngestAsync(RuntimeIncidentIngestBatch batch, CancellationToken cancellationToken)
    {
        if (batch.Incidents.Count == 0)
        {
            return;
        }

        foreach (var incident in batch.Incidents)
        {
            if (string.IsNullOrWhiteSpace(incident.ToolSlug) || string.IsNullOrWhiteSpace(incident.Message))
            {
                continue;
            }

            var normalized = incident with
            {
                ToolSlug = incident.ToolSlug.Trim().ToLowerInvariant(),
                Phase = NormalizePhase(incident.Phase),
                ErrorType = NormalizeErrorType(incident.ErrorType),
                Severity = NormalizeSeverity(incident.Severity, incident.ErrorType),
                PayloadType = string.IsNullOrWhiteSpace(incident.PayloadType) ? "unknown" : incident.PayloadType.Trim().ToLowerInvariant(),
                Timestamp = incident.Timestamp == default ? DateTime.UtcNow : incident.Timestamp,
                Count = Math.Clamp(incident.Count, 1, 500),
                CorrelationId = NormalizeCorrelationId(incident.CorrelationId)
            };

            try
            {
                await repository.UpsertAsync(normalized, cancellationToken);
            }
            catch
            {
                // incident ingestion must remain best-effort and never break runtime request flow
            }
        }
    }

    public Task<IReadOnlyList<RuntimeIncidentSummary>> GetLatestSummariesAsync(int take, CancellationToken cancellationToken)
        => repository.GetLatestSummariesAsync(Math.Clamp(take, 1, 200), cancellationToken);

    public Task<IReadOnlyList<RuntimeToolHealthSnapshot>> GetToolHealthAsync(CancellationToken cancellationToken)
        => repository.GetToolHealthAsync(cancellationToken);

    private static string NormalizePhase(string? phase)
        => phase is "bootstrap" or "mount" or "execute" ? phase : "execute";

    private static string NormalizeErrorType(string? errorType)
        => errorType is "contract_violation" or "runtime_error" ? errorType : "runtime_error";

    private static string NormalizeSeverity(string? severity, string errorType)
    {
        if (severity is "info" or "warning" or "critical")
        {
            return severity;
        }

        return string.Equals(errorType, "contract_violation", StringComparison.OrdinalIgnoreCase) ? "warning" : "critical";
    }

    private static string? NormalizeCorrelationId(string? correlationId)
    {
        if (string.IsNullOrWhiteSpace(correlationId))
        {
            return null;
        }

        var trimmed = correlationId.Trim();
        return trimmed[..Math.Min(trimmed.Length, 120)];
    }
}


