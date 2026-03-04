using System.Text;
using System.Text.RegularExpressions;

namespace ToolNexus.Web.Services;

public sealed class CssOptimizerService(CssCoverageService cssCoverageService)
{
    private static readonly Regex CssBlockRegex = new(@"(?s)([^{}]+)\{([^{}]*)\}", RegexOptions.Compiled);

    public async Task<string> Optimize(string url, CancellationToken cancellationToken = default)
    {
        var coverage = await cssCoverageService.Analyze(url, cancellationToken);
        return OptimizeCss(coverage.CssContent, coverage.UsedSelectors);
    }

    public string OptimizeCss(string fullCssContent, ISet<string> usedSelectors)
    {
        if (string.IsNullOrWhiteSpace(fullCssContent))
        {
            return string.Empty;
        }

        var output = new StringBuilder();

        foreach (Match match in CssBlockRegex.Matches(fullCssContent))
        {
            var selector = match.Groups[1].Value.Trim();
            var body = match.Groups[2].Value;

            if (selector.StartsWith("@media", StringComparison.OrdinalIgnoreCase)
                || selector.StartsWith("@keyframes", StringComparison.OrdinalIgnoreCase)
                || selector.StartsWith("@font-face", StringComparison.OrdinalIgnoreCase))
            {
                output.AppendLine(match.Value);
                continue;
            }

            var keptSelectors = selector
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Where(s => IsSelectorUsed(s, usedSelectors))
                .ToArray();

            if (keptSelectors.Length == 0)
            {
                continue;
            }

            output.AppendLine($"{string.Join(", ", keptSelectors)} {{{body}}}");
        }

        return output.ToString();
    }

    private static bool IsSelectorUsed(string selector, ISet<string> usedSelectors)
    {
        var tokens = Regex.Matches(selector, @"(\.[A-Za-z0-9_-]+|#[A-Za-z0-9_-]+|\b[a-zA-Z][a-zA-Z0-9_-]*\b)")
            .Select(m => m.Value)
            .ToArray();

        if (tokens.Length == 0)
        {
            return true;
        }

        return tokens.Any(token => usedSelectors.Contains(token));
    }
}
