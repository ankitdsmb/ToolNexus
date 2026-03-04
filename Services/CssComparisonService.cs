namespace ToolNexus.Web.Services;

public sealed class CssComparisonService(
    CssCoverageService cssCoverageService,
    CssAnalysisService cssAnalysisService)
{
    public async Task<CssComparisonResult> CompareAsync(
        string urlA,
        string urlB,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(urlA);
        ArgumentException.ThrowIfNullOrWhiteSpace(urlB);

        cancellationToken.ThrowIfCancellationRequested();

        var firstCoverageTask = cssCoverageService.Analyze(urlA, cancellationToken);
        var secondCoverageTask = cssCoverageService.Analyze(urlB, cancellationToken);

        await Task.WhenAll(firstCoverageTask, secondCoverageTask);

        var firstAnalysis = cssAnalysisService.Process(await firstCoverageTask);
        var secondAnalysis = cssAnalysisService.Process(await secondCoverageTask);

        var difference = Math.Round(
            Math.Abs(firstAnalysis.EfficiencyScore - secondAnalysis.EfficiencyScore),
            2,
            MidpointRounding.AwayFromZero);

        var betterSite = DetermineBetterSite(urlA, urlB, firstAnalysis.EfficiencyScore, secondAnalysis.EfficiencyScore);

        return new CssComparisonResult
        {
            UrlA = urlA,
            UrlB = urlB,
            AnalysisA = firstAnalysis,
            AnalysisB = secondAnalysis,
            BetterSite = betterSite,
            EfficiencyDifference = difference
        };
    }

    private static string DetermineBetterSite(string urlA, string urlB, double scoreA, double scoreB)
    {
        if (Math.Abs(scoreA - scoreB) < 0.01)
        {
            return "tie";
        }

        return scoreA > scoreB ? urlA : urlB;
    }
}

public sealed class CssComparisonResult
{
    public string UrlA { get; init; } = string.Empty;
    public string UrlB { get; init; } = string.Empty;
    public CssAnalysisResult AnalysisA { get; init; } = new();
    public CssAnalysisResult AnalysisB { get; init; } = new();
    public string BetterSite { get; init; } = string.Empty;
    public double EfficiencyDifference { get; init; }
}
