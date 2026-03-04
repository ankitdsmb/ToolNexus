using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using AngleSharp;
using AngleSharp.Dom;
using AngleSharp.Html.Dom;
using ExCSS;
using ToolNexus.Domain;

namespace ToolNexus.ToolLibrary;

public sealed class CssIntelligenceEngine : ICssIntelligenceEngine
{
    private static readonly JsonSerializerOptions StableJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly HttpClient _httpClient;

    public CssIntelligenceEngine(HttpClient? httpClient = null)
    {
        _httpClient = httpClient ?? CreateDefaultClient();
    }

    public async ValueTask<CssAnalysisResult> AnalyzeAsync(CssAnalysisRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var options = request.Options ?? new CssIntelligenceOptions();
        var warnings = new List<CssWarning>();
        var files = new List<CssFileReport>();
        var selectorIndex = new ConcurrentDictionary<string, SelectorAccumulator>(StringComparer.Ordinal);

        var seedUrls = request.SourceFiles
            .Where(static u => !string.IsNullOrWhiteSpace(u))
            .Select(static u => u.Trim())
            .Distinct(StringComparer.Ordinal)
            .OrderBy(static u => u, StringComparer.Ordinal)
            .ToList();

        foreach (var seedUrl in seedUrls)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!TryValidateExternalUrl(seedUrl, out var uri, out var reason))
            {
                warnings.Add(new CssWarning { Code = "EXTERNAL_ONLY", Severity = "Warning", Message = reason, FilePath = seedUrl });
                continue;
            }

            var crawlResult = await CrawlAsync(uri!, options, cancellationToken).ConfigureAwait(false);
            warnings.AddRange(crawlResult.Warnings);

            foreach (var page in crawlResult.Pages.OrderBy(static p => p.Url, StringComparer.Ordinal))
            {
                var fileWarnings = new List<CssWarning>();
                fileWarnings.AddRange(page.Warnings);

                foreach (var cssAsset in page.CssAssets.OrderBy(static c => c.Url, StringComparer.Ordinal))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var parsedSelectors = ParseSelectors(cssAsset.Content, options, cssAsset.Url, warnings);

                    foreach (var selector in parsedSelectors)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        var matched = selector.TryQueryCountOn(page.Document, out var count);
                        var confidence = CalculateConfidence(selector.Text, count, matched, options.Mode);

                        selectorIndex.AddOrUpdate(
                            selector.Text,
                            _ => SelectorAccumulator.From(selector.Text, cssAsset.Url, count, IsUtilitySelector(selector.Text), confidence),
                            (_, existing) => existing.WithOccurrence(cssAsset.Url, count, confidence));
                    }
                }

                files.Add(new CssFileReport
                {
                    FilePath = page.Url,
                    Selectors = BuildSelectorsForFile(selectorIndex, page.Url),
                    Warnings = fileWarnings.OrderBy(static w => w.Code, StringComparer.Ordinal).ThenBy(static w => w.Message, StringComparer.Ordinal).ToArray()
                });
            }
        }

        var selectors = selectorIndex
            .OrderBy(static kv => kv.Key, StringComparer.Ordinal)
            .Select(static kv => kv.Value.ToReport())
            .ToList();

        warnings.AddRange(DetectDuplicateSelectors(selectors, options));
        warnings = warnings
            .OrderBy(static w => w.Code, StringComparer.Ordinal)
            .ThenBy(static w => w.FilePath, StringComparer.Ordinal)
            .ThenBy(static w => w.Selector, StringComparer.Ordinal)
            .Take(Math.Max(0, options.WarningLimit))
            .ToList();

        var report = new CssAnalysisReport
        {
            GeneratedAtUtc = DateTimeOffset.UtcNow,
            Files = files.OrderBy(static f => f.FilePath, StringComparer.Ordinal).ToArray(),
            Selectors = selectors
        };

        _ = ToStableJson(report);

        return new CssAnalysisResult
        {
            Report = report,
            Warnings = warnings
        };
    }

    public static string ToStableJson(CssAnalysisReport report) => JsonSerializer.Serialize(report, StableJsonOptions);

    private static HttpClient CreateDefaultClient()
    {
        var handler = new HttpClientHandler
        {
            AllowAutoRedirect = false
        };

        return new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(30)
        };
    }

    private static IReadOnlyList<CssWarning> DetectDuplicateSelectors(IReadOnlyList<CssSelectorReport> selectors, CssIntelligenceOptions options)
    {
        if (!options.DetectDuplicateSelectors)
        {
            return Array.Empty<CssWarning>();
        }

        return selectors
            .Where(static s => s.SourceFiles.Count > 1)
            .Select(static s => new CssWarning
            {
                Code = "DUPLICATE_SELECTOR",
                Severity = "Info",
                Selector = s.Selector,
                Message = $"Selector '{s.Selector}' appears in multiple sources."
            })
            .ToArray();
    }

    private static IReadOnlyList<CssSelectorReport> BuildSelectorsForFile(ConcurrentDictionary<string, SelectorAccumulator> index, string filePath)
        => index.Values
            .Where(v => v.SourceFiles.Contains(filePath, StringComparer.Ordinal))
            .OrderBy(v => v.Selector, StringComparer.Ordinal)
            .Select(v => v.ToReport())
            .ToArray();

    private static bool IsUtilitySelector(string selector)
        => selector.StartsWith(".", StringComparison.Ordinal)
            && selector.Count(ch => ch == '-') >= 1
            && selector.Length <= 40;

    private static double CalculateConfidence(string selector, int matchCount, bool matched, CssIntelligenceMode mode)
    {
        if (!matched)
        {
            return 0;
        }

        var baseScore = Math.Min(1.0, 0.25 + (matchCount * 0.12));
        if (mode == CssIntelligenceMode.Aggressive)
        {
            baseScore += 0.15;
        }

        if (selector.Contains(':', StringComparison.Ordinal))
        {
            baseScore -= 0.1;
        }

        return Math.Clamp(baseScore, 0, 1);
    }

    private static IReadOnlyList<SelectorProbe> ParseSelectors(string css, CssIntelligenceOptions options, string sourceUrl, List<CssWarning> warnings)
    {
        if (Encoding.UTF8.GetByteCount(css) > options.MaxCssBytes)
        {
            warnings.Add(new CssWarning { Code = "CSS_SIZE_LIMIT", Severity = "Warning", FilePath = sourceUrl, Message = "CSS content exceeded size limit." });
            css = css[..Math.Min(css.Length, options.MaxCssBytes)];
        }

        var parser = new StylesheetParser();
        var styleSheet = parser.Parse(css);
        var selectors = new List<SelectorProbe>();
        var declarationCount = 0;
        var importantCount = 0;

        foreach (var rule in styleSheet.Children)
        {
            if (rule is StyleRule styleRule)
            {
                foreach (var selector in styleRule.SelectorText.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
                {
                    selectors.Add(new SelectorProbe(selector));
                }

                declarationCount += styleRule.Style.Count();
                importantCount += styleRule.Style.Count(static d => d.IsImportant);
                continue;
            }

            var ruleText = rule.ToString() ?? string.Empty;
            if (ruleText.StartsWith("@keyframes", StringComparison.OrdinalIgnoreCase))
            {
                warnings.Add(new CssWarning { Code = "KEYFRAME_DETECTED", Severity = "Info", FilePath = sourceUrl, Message = "@keyframes rule detected." });
            }

            if (ruleText.StartsWith("@font-face", StringComparison.OrdinalIgnoreCase))
            {
                warnings.Add(new CssWarning { Code = "FONT_FACE_DETECTED", Severity = "Info", FilePath = sourceUrl, Message = "@font-face rule detected." });
            }
        }

        if (declarationCount > 0)
        {
            var importantPercentage = (int)Math.Round((importantCount / (double)declarationCount) * 100, MidpointRounding.AwayFromZero);
            if (importantPercentage >= options.ImportantThresholdPercent)
            {
                warnings.Add(new CssWarning
                {
                    Code = "IMPORTANT_THRESHOLD",
                    Severity = "Warning",
                    FilePath = sourceUrl,
                    Message = $"!important usage ({importantPercentage}%) reached configured threshold ({options.ImportantThresholdPercent}%)."
                });
            }
        }

        var frameworkWarnings = DetectFrameworks(css, sourceUrl);
        warnings.AddRange(frameworkWarnings);

        return selectors
            .DistinctBy(static s => s.Text, StringComparer.Ordinal)
            .OrderBy(static s => s.Text, StringComparer.Ordinal)
            .ToArray();
    }

    private static IReadOnlyList<CssWarning> DetectFrameworks(string css, string sourceUrl)
    {
        var output = new List<CssWarning>();
        if (css.Contains("--bs-", StringComparison.Ordinal))
        {
            output.Add(new CssWarning { Code = "FRAMEWORK_BOOTSTRAP", Severity = "Info", FilePath = sourceUrl, Message = "Bootstrap signature detected." });
        }

        if (css.Contains("--tw-", StringComparison.Ordinal) || css.Contains("@tailwind", StringComparison.Ordinal))
        {
            output.Add(new CssWarning { Code = "FRAMEWORK_TAILWIND", Severity = "Info", FilePath = sourceUrl, Message = "Tailwind CSS signature detected." });
        }

        if (css.Contains(".Mui", StringComparison.Ordinal) || css.Contains("--mui", StringComparison.Ordinal))
        {
            output.Add(new CssWarning { Code = "FRAMEWORK_MUI", Severity = "Info", FilePath = sourceUrl, Message = "Material UI signature detected." });
        }

        return output;
    }

    private async Task<CrawlResult> CrawlAsync(Uri startUri, CssIntelligenceOptions options, CancellationToken cancellationToken)
    {
        var visited = new HashSet<string>(StringComparer.Ordinal);
        var queue = new Queue<Uri>();
        var pages = new List<CrawledPage>();
        var warnings = new List<CssWarning>();
        queue.Enqueue(startUri);

        var context = BrowsingContext.New(Configuration.Default);

        while (queue.Count > 0 && pages.Count < Math.Max(1, options.MaxPages))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var next = queue.Dequeue();
            if (!visited.Add(next.AbsoluteUri))
            {
                continue;
            }

            var fetchResult = await FetchAsync(next, options, cancellationToken).ConfigureAwait(false);
            warnings.AddRange(fetchResult.Warnings);
            if (fetchResult.Content is null)
            {
                continue;
            }

            var document = await context.OpenAsync(req => req.Content(fetchResult.Content).Address(fetchResult.FinalUri.AbsoluteUri), cancellationToken).ConfigureAwait(false);
            var cssAssets = new List<CssAsset>();

            foreach (var link in document.QuerySelectorAll("link[rel=stylesheet]").OfType<IHtmlLinkElement>())
            {
                cancellationToken.ThrowIfCancellationRequested();
                var href = link.Href;
                if (string.IsNullOrWhiteSpace(href) || !Uri.TryCreate(fetchResult.FinalUri, href, out var cssUri))
                {
                    continue;
                }

                if (!await IsAllowedExternalAsync(cssUri, cancellationToken).ConfigureAwait(false))
                {
                    warnings.Add(new CssWarning { Code = "SSRF_BLOCKED", Severity = "Warning", FilePath = cssUri.AbsoluteUri, Message = "Blocked potential SSRF target." });
                    continue;
                }

                var cssFetch = await FetchAsync(cssUri, options, cancellationToken).ConfigureAwait(false);
                warnings.AddRange(cssFetch.Warnings);
                if (!string.IsNullOrWhiteSpace(cssFetch.Content))
                {
                    cssAssets.Add(new CssAsset(cssFetch.FinalUri.AbsoluteUri, cssFetch.Content));
                }
            }

            pages.Add(new CrawledPage(fetchResult.FinalUri.AbsoluteUri, document, cssAssets, fetchResult.Warnings));

            if (options.Mode == CssIntelligenceMode.Aggressive)
            {
                foreach (var anchor in document.QuerySelectorAll("a[href]").OfType<IHtmlAnchorElement>())
                {
                    if (Uri.TryCreate(fetchResult.FinalUri, anchor.Href, out var child)
                        && child.Host.Equals(startUri.Host, StringComparison.OrdinalIgnoreCase)
                        && !visited.Contains(child.AbsoluteUri))
                    {
                        queue.Enqueue(child);
                    }
                }
            }
        }

        return new CrawlResult(pages, warnings);
    }

    private async Task<FetchResult> FetchAsync(Uri uri, CssIntelligenceOptions options, CancellationToken cancellationToken)
    {
        var warnings = new List<CssWarning>();
        var current = uri;

        for (var i = 0; i <= options.MaxRedirects; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!await IsAllowedExternalAsync(current, cancellationToken).ConfigureAwait(false))
            {
                warnings.Add(new CssWarning { Code = "SSRF_BLOCKED", Severity = "Warning", FilePath = current.AbsoluteUri, Message = "Blocked potential SSRF target." });
                return new FetchResult(current, null, warnings);
            }

            using var response = await _httpClient.GetAsync(current, HttpCompletionOption.ResponseHeadersRead, cancellationToken).ConfigureAwait(false);
            if (IsRedirect(response.StatusCode) && response.Headers.Location is not null)
            {
                current = response.Headers.Location.IsAbsoluteUri
                    ? response.Headers.Location
                    : new Uri(current, response.Headers.Location);

                if (i == options.MaxRedirects)
                {
                    warnings.Add(new CssWarning { Code = "REDIRECT_LIMIT", Severity = "Warning", FilePath = uri.AbsoluteUri, Message = "Redirect limit reached." });
                    return new FetchResult(current, null, warnings);
                }

                continue;
            }

            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
            using var memory = new MemoryStream();
            var buffer = new byte[8192];
            var totalRead = 0;

            while (true)
            {
                var read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken).ConfigureAwait(false);
                if (read == 0)
                {
                    break;
                }

                totalRead += read;
                if (totalRead > options.MaxResponseBytes)
                {
                    warnings.Add(new CssWarning { Code = "RESPONSE_SIZE_LIMIT", Severity = "Warning", FilePath = current.AbsoluteUri, Message = "Response size exceeded configured limit." });
                    return new FetchResult(current, null, warnings);
                }

                await memory.WriteAsync(buffer.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
            }

            var content = Encoding.UTF8.GetString(memory.ToArray());
            return new FetchResult(current, content, warnings);
        }

        return new FetchResult(uri, null, warnings);
    }

    private static bool IsRedirect(HttpStatusCode statusCode)
        => statusCode is HttpStatusCode.Moved
            or HttpStatusCode.Redirect
            or HttpStatusCode.RedirectMethod
            or HttpStatusCode.TemporaryRedirect
            or HttpStatusCode.PermanentRedirect;

    private static bool TryValidateExternalUrl(string raw, out Uri? uri, out string reason)
    {
        uri = null;
        reason = string.Empty;

        if (!Uri.TryCreate(raw, UriKind.Absolute, out var parsed)
            || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            reason = "Only absolute HTTP(S) URLs are supported.";
            return false;
        }

        if (parsed.IsLoopback || parsed.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            reason = "Localhost and loopback URLs are not allowed.";
            return false;
        }

        uri = parsed;
        return true;
    }

    private static async Task<bool> IsAllowedExternalAsync(Uri uri, CancellationToken cancellationToken)
    {
        if (uri.IsLoopback || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (IPAddress.TryParse(uri.Host, out var directIp))
        {
            return !IsPrivateIp(directIp);
        }

        var addresses = await Dns.GetHostAddressesAsync(uri.Host, cancellationToken).ConfigureAwait(false);
        return addresses.All(static a => !IsPrivateIp(a));
    }

    private static bool IsPrivateIp(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip))
        {
            return true;
        }

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = ip.GetAddressBytes();
            return bytes[0] switch
            {
                10 => true,
                127 => true,
                169 when bytes[1] == 254 => true,
                172 when bytes[1] is >= 16 and <= 31 => true,
                192 when bytes[1] == 168 => true,
                _ => false
            };
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast;
        }

        return false;
    }

    private sealed record SelectorProbe(string Text)
    {
        public bool TryQueryCountOn(IDocument document, out int count)
        {
            count = 0;

            try
            {
                count = document.QuerySelectorAll(Text).Length;
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    private sealed record SelectorAccumulator(string Selector, int OccurrenceCount, bool IsUtilitySelector, double ConfidenceScore, HashSet<string> SourceFiles)
    {
        public static SelectorAccumulator From(string selector, string sourceUrl, int occurrenceCount, bool isUtilitySelector, double confidence)
            => new(selector, occurrenceCount, isUtilitySelector, confidence, new HashSet<string>(StringComparer.Ordinal) { sourceUrl });

        public SelectorAccumulator WithOccurrence(string sourceUrl, int count, double confidence)
        {
            SourceFiles.Add(sourceUrl);
            return this with
            {
                OccurrenceCount = OccurrenceCount + count,
                ConfidenceScore = Math.Max(ConfidenceScore, confidence)
            };
        }

        public CssSelectorReport ToReport()
            => new()
            {
                Selector = Selector,
                OccurrenceCount = OccurrenceCount,
                IsUtilitySelector = IsUtilitySelector,
                ConfidenceScore = ConfidenceScore,
                SourceFiles = SourceFiles.OrderBy(static x => x, StringComparer.Ordinal).ToArray()
            };
    }

    private sealed record CssAsset(string Url, string Content);
    private sealed record CrawledPage(string Url, IDocument Document, IReadOnlyList<CssAsset> CssAssets, IReadOnlyList<CssWarning> Warnings);
    private sealed record CrawlResult(IReadOnlyList<CrawledPage> Pages, IReadOnlyList<CssWarning> Warnings);
    private sealed record FetchResult(Uri FinalUri, string? Content, IReadOnlyList<CssWarning> Warnings);
}
