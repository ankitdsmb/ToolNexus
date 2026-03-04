namespace ToolNexus.Web.Services;

public sealed class CssAnalysisService
{
    public CssAnalysisResult Process(CssCoverageResult coverage)
    {
        ArgumentNullException.ThrowIfNull(coverage);

        var totalCss = coverage.TotalCss;
        var usedCss = coverage.UsedCss;
        var unusedCss = Math.Max(0, coverage.UnusedCss);

        var efficiencyScore = totalCss <= 0
            ? 0
            : Math.Round((double)usedCss / totalCss * 100, 2, MidpointRounding.AwayFromZero);

        var frameworkDetected = DetectFramework(coverage.CssContent);

        return new CssAnalysisResult
        {
            TotalCss = totalCss,
            UsedCss = usedCss,
            UnusedCss = unusedCss,
            EfficiencyScore = efficiencyScore,
            FrameworkDetected = frameworkDetected,
            EstimatedSpeedImpact = unusedCss,
            PagesScanned = coverage.PagesScanned
        };
    }

    private static string DetectFramework(string? css)
    {
        if (string.IsNullOrWhiteSpace(css))
        {
            return "None";
        }

        if (css.Contains(".container", StringComparison.OrdinalIgnoreCase)
            && css.Contains(".row", StringComparison.OrdinalIgnoreCase))
        {
            return "Bootstrap";
        }

        if (css.Contains("--tw-", StringComparison.OrdinalIgnoreCase))
        {
            return "Tailwind";
        }

        if (css.Contains(".grid-x", StringComparison.OrdinalIgnoreCase))
        {
            return "Foundation";
        }

        return "None";
    }
}

public sealed class CssAnalysisResult
{
    public int TotalCss { get; init; }
    public int UsedCss { get; init; }
    public int UnusedCss { get; init; }
    public double EfficiencyScore { get; init; }
    public string FrameworkDetected { get; init; } = "None";
    public int EstimatedSpeedImpact { get; init; }
    public int PagesScanned { get; init; }
}
