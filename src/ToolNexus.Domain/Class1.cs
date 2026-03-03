namespace ToolNexus.Domain;

public interface ICssIntelligenceEngine
{
    ValueTask<CssAnalysisResult> AnalyzeAsync(
        CssAnalysisRequest request,
        CancellationToken cancellationToken = default);
}

public sealed record CssAnalysisRequest
{
    public string Name { get; init; } = string.Empty;
    public IReadOnlyList<string> SourceFiles { get; init; } = Array.Empty<string>();
    public CssIntelligenceOptions Options { get; init; } = new();
}

public sealed record CssAnalysisResult
{
    public CssAnalysisReport Report { get; init; } = new();
    public IReadOnlyList<CssWarning> Warnings { get; init; } = Array.Empty<CssWarning>();
}

public sealed record CssAnalysisReport
{
    public DateTimeOffset GeneratedAtUtc { get; init; } = DateTimeOffset.UtcNow;
    public IReadOnlyList<CssFileReport> Files { get; init; } = Array.Empty<CssFileReport>();
    public IReadOnlyList<CssSelectorReport> Selectors { get; init; } = Array.Empty<CssSelectorReport>();
}

public sealed record CssFileReport
{
    public string FilePath { get; init; } = string.Empty;
    public IReadOnlyList<CssSelectorReport> Selectors { get; init; } = Array.Empty<CssSelectorReport>();
    public IReadOnlyList<CssWarning> Warnings { get; init; } = Array.Empty<CssWarning>();
}

public sealed record CssSelectorReport
{
    public string Selector { get; init; } = string.Empty;
    public int OccurrenceCount { get; init; }
    public bool IsUtilitySelector { get; init; }
    public double ConfidenceScore { get; init; }
    public IReadOnlyList<string> SourceFiles { get; init; } = Array.Empty<string>();
}

public sealed record CssWarning
{
    public string Code { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string Severity { get; init; } = string.Empty;
    public string? FilePath { get; init; }
    public string? Selector { get; init; }
}

public enum CssIntelligenceMode
{
    Safe = 0,
    Aggressive = 1
}

public sealed record CssIntelligenceOptions
{
    public bool DetectDuplicateSelectors { get; init; } = true;
    public bool ClassifyUtilitySelectors { get; init; } = true;
    public IReadOnlyList<string> ExcludedPathPatterns { get; init; } = Array.Empty<string>();
    public int WarningLimit { get; init; } = 500;
    public int MaxPages { get; init; } = 5;
    public int MaxRedirects { get; init; } = 5;
    public int MaxResponseBytes { get; init; } = 1_048_576;
    public int MaxCssBytes { get; init; } = 1_048_576;
    public int ImportantThresholdPercent { get; init; } = 35;
    public CssIntelligenceMode Mode { get; init; } = CssIntelligenceMode.Safe;
}
