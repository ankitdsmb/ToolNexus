using ToolNexus.Application.Models;

namespace ToolNexus.Application.Contracts;

public sealed record ToolExecutionResultDto(
    bool Success,
    string Output,
    string? Error,
    bool NotFound,
    ToolInsightResult? Insight);
