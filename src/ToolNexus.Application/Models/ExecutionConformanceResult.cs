namespace ToolNexus.Application.Models;

public sealed record ExecutionConformanceResult(
    bool IsValid,
    string NormalizedStatus,
    IReadOnlyList<string> ConformanceIssues,
    bool WasNormalized,
    UniversalToolExecutionResult NormalizedResult);
