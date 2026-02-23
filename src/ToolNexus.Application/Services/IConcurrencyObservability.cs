namespace ToolNexus.Application.Services;

public sealed record ConcurrencyAlertSnapshot(
    string Signal,
    string Severity,
    string Description,
    string ResourceType,
    double CurrentValue,
    double Threshold);

public sealed record ConcurrencyHealthSnapshot(
    long TotalConflictsLast24Hours,
    IReadOnlyList<ConcurrencyTrendPoint> ConflictTrend,
    IReadOnlyList<ConcurrencyResourceConflictPoint> TopConflictingResources,
    IReadOnlyList<ConcurrencyAlertSnapshot> Alerts);

public sealed record ConcurrencyTrendPoint(DateTime HourUtc, long Conflicts);

public sealed record ConcurrencyResourceConflictPoint(string ResourceType, long Conflicts, double ConflictRatePercent);

public interface IConcurrencyObservability
{
    void RecordWriteAttempt(string resourceType);
    void RecordMissingVersionToken(string resourceType);
    void RecordConflict(string resourceType, string? clientVersionToken, string? serverVersionToken);
    void RecordResolutionAction(string resourceType, string action);
    void RecordStaleUpdateAttempt(string resourceType);
    ConcurrencyHealthSnapshot GetHealthSnapshot();
}
