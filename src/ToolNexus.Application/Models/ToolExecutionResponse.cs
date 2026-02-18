namespace ToolNexus.Application.Models;

public sealed record ToolExecutionResponse(bool Success, string Output, string? Error = null, bool NotFound = false, ToolInsightResult? Insight = null);
