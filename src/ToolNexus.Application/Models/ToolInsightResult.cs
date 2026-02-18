namespace ToolNexus.Application.Models;

public sealed record ToolInsightResult(
    string Title,
    string Explanation,
    string Suggestion,
    string? ExampleFix = null,
    int Confidence = 100);
