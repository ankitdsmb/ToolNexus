using System.Text.RegularExpressions;
using ToolNexus.Domain.CssIntelligence;

namespace ToolNexus.ToolLibrary;

public sealed partial class CssInspectionService : ICssIntelligenceEngine
{
    private static readonly Regex ClassSelectorRegex = new(@"\.[A-Za-z_][A-Za-z0-9_-]*", RegexOptions.Compiled);
    private static readonly Regex IdSelectorRegex = new(@"#[A-Za-z_][A-Za-z0-9_-]*", RegexOptions.Compiled);
    private static readonly Regex TagSelectorRegex = new(@"(?<![\w-])([a-z][a-z0-9-]*)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex ClassAttributeRegex = new("class\\s*=\\s*[\"']([^\"']+)[\"']", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex IdAttributeRegex = new("id\\s*=\\s*[\"']([^\"']+)[\"']", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex TagInHtmlRegex = new(@"<\s*([a-z][a-z0-9-]*)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex KeyframeRegex = new(@"@keyframes\s+([A-Za-z_][A-Za-z0-9_-]*)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex FontFaceRegex = new(@"@font-face", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public CssInspectionResult Analyze(CssInspectionRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        cancellationToken.ThrowIfCancellationRequested();

        GuardAgainstInvalidUrl(request.CssUrl);
        EnforceSizeLimits(request);

        var selectorCounts = BuildSelectorCounts(request.CssContent, request.Mode, cancellationToken);
        var htmlTokens = BuildHtmlTokens(request.HtmlContent, request.Mode, cancellationToken);

        var used = new List<string>();
        var unused = new List<string>();

        foreach (var selector in selectorCounts.Keys.OrderBy(static s => s, StringComparer.Ordinal))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (htmlTokens.Contains(selector))
            {
                used.Add(selector);
            }
            else
            {
                unused.Add(selector);
            }
        }

        var duplicates = selectorCounts
            .Where(static pair => pair.Value > 1)
            .Select(static pair => pair.Key)
            .OrderBy(static s => s, StringComparer.Ordinal)
            .ToArray();

        var keyframes = KeyframeRegex
            .Matches(request.CssContent)
            .Select(static m => m.Groups[1].Value)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(static k => k, StringComparer.Ordinal)
            .ToArray();

        var fontFaceCount = FontFaceRegex.Matches(request.CssContent).Count;

        return new CssInspectionResult
        {
            UsedSelectors = used,
            UnusedSelectors = unused,
            DuplicateSelectors = duplicates,
            Keyframes = keyframes,
            FontFaceCount = fontFaceCount,
            ConfidenceScore = ComputeConfidenceScore(used.Count, unused.Count, duplicates.Length, request.Mode)
        };
    }

    public ValueTask<CssAnalysisResult> AnalyzeAsync(CssAnalysisRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        cancellationToken.ThrowIfCancellationRequested();

        var report = new CssAnalysisReport
        {
            GeneratedAtUtc = DateTimeOffset.UtcNow,
            Files = new[]
            {
                new CssFileReport
                {
                    FilePath = request.SourceName,
                    SelectorCount = ClassSelectorRegex.Matches(request.CssContent).Count,
                    Selectors = Array.Empty<CssSelectorReport>()
                }
            },
            Selectors = Array.Empty<CssSelectorReport>()
        };

        return ValueTask.FromResult(new CssAnalysisResult
        {
            IsSuccessful = true,
            Report = report,
            Warnings = Array.Empty<CssWarning>()
        });
    }

    private static Dictionary<string, int> BuildSelectorCounts(string css, CssAnalysisMode mode, CancellationToken cancellationToken)
    {
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);

        AddMatches(ClassSelectorRegex.Matches(css), counts, cancellationToken);

        if (mode == CssAnalysisMode.Aggressive)
        {
            AddMatches(IdSelectorRegex.Matches(css), counts, cancellationToken);
            AddTagMatches(css, counts, cancellationToken);
        }

        return counts;
    }

    private static HashSet<string> BuildHtmlTokens(string html, CssAnalysisMode mode, CancellationToken cancellationToken)
    {
        var tokens = new HashSet<string>(StringComparer.Ordinal);

        foreach (Match match in ClassAttributeRegex.Matches(html))
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var name in match.Groups[1].Value.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                tokens.Add($".{name}");
            }
        }

        if (mode == CssAnalysisMode.Aggressive)
        {
            foreach (Match match in IdAttributeRegex.Matches(html))
            {
                cancellationToken.ThrowIfCancellationRequested();
                tokens.Add($"#{match.Groups[1].Value}");
            }

            foreach (Match match in TagInHtmlRegex.Matches(html))
            {
                cancellationToken.ThrowIfCancellationRequested();
                tokens.Add(match.Groups[1].Value.ToLowerInvariant());
            }
        }

        return tokens;
    }

    private static void AddMatches(MatchCollection matches, IDictionary<string, int> counts, CancellationToken cancellationToken)
    {
        foreach (Match match in matches)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var token = match.Value;
            counts[token] = counts.TryGetValue(token, out var existing) ? existing + 1 : 1;
        }
    }

    private static void AddTagMatches(string css, IDictionary<string, int> counts, CancellationToken cancellationToken)
    {
        var cssWithoutAtRules = Regex.Replace(css, @"@[^{]+\{", string.Empty);
        foreach (Match match in TagSelectorRegex.Matches(cssWithoutAtRules))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var tag = match.Groups[1].Value.ToLowerInvariant();
            if (tag is "keyframes" or "font")
            {
                continue;
            }

            counts[tag] = counts.TryGetValue(tag, out var existing) ? existing + 1 : 1;
        }
    }

    private static double ComputeConfidenceScore(int usedCount, int unusedCount, int duplicateCount, CssAnalysisMode mode)
    {
        var total = Math.Max(1, usedCount + unusedCount);
        var usageRatio = (double)usedCount / total;
        var duplicatePenalty = Math.Min(0.2, duplicateCount * 0.05);
        var modeAdjustment = mode == CssAnalysisMode.Safe ? -0.05 : 0.05;

        var score = usageRatio - duplicatePenalty + modeAdjustment;
        return Math.Round(Math.Clamp(score, 0d, 1d), 4, MidpointRounding.AwayFromZero);
    }

    private static void GuardAgainstInvalidUrl(string? cssUrl)
    {
        if (string.IsNullOrWhiteSpace(cssUrl))
        {
            return;
        }

        if (!Uri.TryCreate(cssUrl, UriKind.Absolute, out var uri))
        {
            throw new InvalidOperationException("Invalid CSS URL provided.");
        }

        if (uri.Scheme is not ("http" or "https"))
        {
            throw new InvalidOperationException("Only HTTP(S) CSS URLs are allowed.");
        }

        if (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            uri.Host.StartsWith("127.", StringComparison.Ordinal) ||
            uri.Host.StartsWith("10.", StringComparison.Ordinal) ||
            uri.Host.StartsWith("192.168.", StringComparison.Ordinal) ||
            uri.Host.StartsWith("169.254.", StringComparison.Ordinal) ||
            uri.Host.Equals("0.0.0.0", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Potential SSRF target blocked.");
        }
    }

    private static void EnforceSizeLimits(CssInspectionRequest request)
    {
        if (request.MaxInputLength <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(request.MaxInputLength));
        }

        if (request.HtmlContent.Length > request.MaxInputLength || request.CssContent.Length > request.MaxInputLength)
        {
            throw new ArgumentException("HTML or CSS content exceeds allowed size.");
        }
    }
}
