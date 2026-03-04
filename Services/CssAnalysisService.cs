namespace ToolNexus.Services;

public sealed class CssAnalysisService
{
    public CssAnalysisResult Analyze(CssCoverageResult coverage)
    {
        ArgumentNullException.ThrowIfNull(coverage);

        var totalCssKb = coverage.totalCssKb;
        var usedCssKb = coverage.usedCssKb;
        var unusedCssKb = Math.Max(0, totalCssKb - usedCssKb);

        var efficiencyScore = totalCssKb <= 0
            ? 0
            : (usedCssKb / totalCssKb) * 100;

        var frameworkDetected = DetectFramework(coverage.cssContent);

        return new CssAnalysisResult
        {
            totalCssKb = totalCssKb,
            usedCssKb = usedCssKb,
            unusedCssKb = unusedCssKb,
            efficiencyScore = efficiencyScore,
            frameworkDetected = frameworkDetected,
            estimatedSpeedImpact = unusedCssKb
        };
    }

    private static string frameworkDetectedNone = "None";

    private static string DetectFramework(string? css)
    {
        if (string.IsNullOrWhiteSpace(css))
        {
            return frameworkDetectedNone;
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

        return frameworkDetectedNone;
    }
}
