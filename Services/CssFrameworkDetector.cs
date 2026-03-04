namespace ToolNexus.Web.Services;

public sealed class CssFrameworkDetector
{
    public CssFrameworkDetectionResult Detect(string? cssContent)
    {
        if (string.IsNullOrWhiteSpace(cssContent))
        {
            return new CssFrameworkDetectionResult("None", 0);
        }

        var signals = new Dictionary<string, string[]>
        {
            ["Bootstrap"] = [".container", ".row", ".col-", ".btn"],
            ["Tailwind"] = ["--tw-", ".flex", ".grid", ".bg-"],
            ["Foundation"] = [".grid-x", ".cell"]
        };

        var winner = "None";
        var bestConfidence = 0d;

        foreach (var (framework, markers) in signals)
        {
            var matches = markers.Count(marker => cssContent.Contains(marker, StringComparison.OrdinalIgnoreCase));
            var confidence = Math.Round((double)matches / markers.Length, 2, MidpointRounding.AwayFromZero);

            if (confidence > bestConfidence)
            {
                bestConfidence = confidence;
                winner = framework;
            }
        }

        return new CssFrameworkDetectionResult(winner, bestConfidence);
    }
}

public sealed record CssFrameworkDetectionResult(string Framework, double Confidence);
