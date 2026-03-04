using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public sealed class CssFrameworkDetector
{
    private static readonly FrameworkSignature[] Signatures =
    [
        new(
            "Bootstrap",
            [
                ".btn",
                ".container",
                ".row",
                ".col-"
            ]),
        new(
            "Tailwind",
            [
                ".tw-",
                ".bg-",
                ".flex",
                ".grid",
                ".md:",
                ".lg:"
            ]),
        new(
            "Foundation",
            [
                ".grid-x",
                ".cell",
                ".callout"
            ])
    ];

    public FrameworkDetectionResult DetectFramework(string cssContent)
    {
        if (string.IsNullOrWhiteSpace(cssContent))
        {
            return new FrameworkDetectionResult();
        }

        var topMatch = default(FrameworkMatch);

        foreach (var signature in Signatures)
        {
            var score = CountMatches(cssContent, signature.Markers);
            if (score == 0)
            {
                continue;
            }

            if (topMatch is null || score > topMatch.Score)
            {
                topMatch = new FrameworkMatch(signature.Name, score, signature.Markers.Length);
            }
        }

        if (topMatch is null)
        {
            return new FrameworkDetectionResult();
        }

        var confidence = Math.Round((double)topMatch.Score / topMatch.TotalMarkers, 2, MidpointRounding.AwayFromZero);

        return new FrameworkDetectionResult
        {
            Framework = topMatch.Name,
            Confidence = confidence
        };
    }

    private static int CountMatches(string content, string[] markers)
    {
        var score = 0;

        foreach (var marker in markers)
        {
            if (content.Contains(marker, StringComparison.OrdinalIgnoreCase))
            {
                score++;
            }
        }

        return score;
    }

    private sealed record FrameworkSignature(string Name, string[] Markers);

    private sealed record FrameworkMatch(string Name, int Score, int TotalMarkers);
}
