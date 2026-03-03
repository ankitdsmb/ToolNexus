namespace ToolNexus.Domain.CssIntelligence;

/// <summary>
/// Represents the input payload for a CSS analysis operation.
/// </summary>
public sealed record class CssAnalysisRequest
{
    /// <summary>
    /// Gets the logical source identifier for the request.
    /// </summary>
    public required string SourceName { get; init; }

    /// <summary>
    /// Gets the CSS content to analyze.
    /// </summary>
    public required string CssContent { get; init; }

    /// <summary>
    /// Gets optional selectors that should be prioritized during analysis.
    /// </summary>
    public IReadOnlyList<string> PrioritySelectors { get; init; } = Array.Empty<string>();
}

/// <summary>
/// Represents the result of a CSS analysis operation.
/// </summary>
public sealed record class CssAnalysisResult
{
    /// <summary>
    /// Gets a value indicating whether the analysis completed successfully.
    /// </summary>
    public bool IsSuccessful { get; init; }

    /// <summary>
    /// Gets the generated analysis report.
    /// </summary>
    public required CssAnalysisReport Report { get; init; }

    /// <summary>
    /// Gets warnings emitted while producing the analysis.
    /// </summary>
    public IReadOnlyList<CssWarning> Warnings { get; init; } = Array.Empty<CssWarning>();
}

/// <summary>
/// Represents an aggregate report for a CSS analysis run.
/// </summary>
public sealed record class CssAnalysisReport
{
    /// <summary>
    /// Gets the UTC timestamp for when the report was generated.
    /// </summary>
    public DateTimeOffset GeneratedAtUtc { get; init; }

    /// <summary>
    /// Gets per-file reports included in the analysis.
    /// </summary>
    public IReadOnlyList<CssFileReport> Files { get; init; } = Array.Empty<CssFileReport>();

    /// <summary>
    /// Gets selector-level reports across all analyzed sources.
    /// </summary>
    public IReadOnlyList<CssSelectorReport> Selectors { get; init; } = Array.Empty<CssSelectorReport>();
}

/// <summary>
/// Represents CSS analysis details for a specific file.
/// </summary>
public sealed record class CssFileReport
{
    /// <summary>
    /// Gets the analyzed file path.
    /// </summary>
    public required string FilePath { get; init; }

    /// <summary>
    /// Gets the number of parsed selectors in the file.
    /// </summary>
    public int SelectorCount { get; init; }

    /// <summary>
    /// Gets the selector reports associated with the file.
    /// </summary>
    public IReadOnlyList<CssSelectorReport> Selectors { get; init; } = Array.Empty<CssSelectorReport>();
}

/// <summary>
/// Represents analysis metrics for a specific selector.
/// </summary>
public sealed record class CssSelectorReport
{
    /// <summary>
    /// Gets the selector text.
    /// </summary>
    public required string Selector { get; init; }

    /// <summary>
    /// Gets the risk level assigned to the selector.
    /// </summary>
    public SelectorRiskLevel RiskLevel { get; init; }

    /// <summary>
    /// Gets the number of times the selector is used.
    /// </summary>
    public int UsageCount { get; init; }

    /// <summary>
    /// Gets the files where the selector appears.
    /// </summary>
    public IReadOnlyList<string> FilePaths { get; init; } = Array.Empty<string>();
}

/// <summary>
/// Represents a warning emitted during CSS analysis.
/// </summary>
public sealed record class CssWarning
{
    /// <summary>
    /// Gets a machine-readable warning code.
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// Gets a human-readable warning message.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Gets an optional source path associated with the warning.
    /// </summary>
    public string? SourcePath { get; init; }
}

/// <summary>
/// Represents options that control CSS intelligence behavior.
/// </summary>
public sealed record class CssIntelligenceOptions
{
    /// <summary>
    /// Gets the maximum number of warnings to include in a result.
    /// </summary>
    public int MaxWarnings { get; init; } = 100;

    /// <summary>
    /// Gets a value indicating whether duplicate selectors should be included in reports.
    /// </summary>
    public bool IncludeDuplicateSelectors { get; init; } = true;

    /// <summary>
    /// Gets a value indicating whether selector risk classification should be performed.
    /// </summary>
    public bool EnableRiskClassification { get; init; } = true;
}
