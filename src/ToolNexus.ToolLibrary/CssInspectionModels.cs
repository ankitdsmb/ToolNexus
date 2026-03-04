namespace ToolNexus.ToolLibrary;

public enum CssAnalysisMode
{
    Safe,
    Aggressive
}

public sealed record CssInspectionRequest
{
    public required string HtmlContent { get; init; }

    public required string CssContent { get; init; }

    public string? CssUrl { get; init; }

    public CssAnalysisMode Mode { get; init; } = CssAnalysisMode.Safe;

    public int MaxInputLength { get; init; } = 100_000;
}

public sealed record CssInspectionResult
{
    public required IReadOnlyList<string> UsedSelectors { get; init; }

    public required IReadOnlyList<string> UnusedSelectors { get; init; }

    public required IReadOnlyList<string> DuplicateSelectors { get; init; }

    public required IReadOnlyList<string> Keyframes { get; init; }

    public int FontFaceCount { get; init; }

    public double ConfidenceScore { get; init; }
}
