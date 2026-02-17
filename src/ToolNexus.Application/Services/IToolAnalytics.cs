namespace ToolNexus.Application.Services;

public interface IToolAnalytics
{
    void TrackExecution(ToolExecutionAnalytics analytics);
}

public sealed record ToolExecutionAnalytics(
    string Slug,
    string Action,
    bool Success,
    long ExecutionTimeMs,
    DateTimeOffset TimestampUtc);
