namespace ToolNexus.Domain.CssIntelligence;

/// <summary>
/// Defines the contract for analyzing CSS usage and producing structured reports.
/// </summary>
public interface ICssIntelligenceEngine
{
    /// <summary>
    /// Analyzes CSS content for the supplied request.
    /// </summary>
    /// <param name="request">The analysis request input.</param>
    /// <param name="cancellationToken">A cancellation token that can cancel the operation.</param>
    /// <returns>A task that resolves to the CSS analysis result.</returns>
    ValueTask<CssAnalysisResult> AnalyzeAsync(CssAnalysisRequest request, CancellationToken cancellationToken = default);
}
