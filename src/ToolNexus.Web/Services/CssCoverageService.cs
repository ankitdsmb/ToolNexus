using Microsoft.Playwright;

namespace ToolNexus.Web.Services;

public sealed class CssCoverageService
{
    private const float TimeoutMilliseconds = 10_000;
    private const int MaxPagesPerScan = 5;

    public async Task<CssCoverageResult> Analyze(string url, CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsedUrl)
            || (parsedUrl.Scheme != Uri.UriSchemeHttp && parsedUrl.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("A valid http/https URL is required.", nameof(url));
        }

        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = true
        });

        await using var context = await browser.NewContextAsync();
        context.SetDefaultNavigationTimeout(TimeoutMilliseconds);
        context.SetDefaultTimeout(TimeoutMilliseconds);

        var page = await context.NewPageAsync();
        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            await page.GotoAsync(url, new PageGotoOptions
            {
                Timeout = TimeoutMilliseconds,
                WaitUntil = WaitUntilState.Load
            });

            await page.Coverage.StartCSSCoverageAsync();

            await page.WaitForLoadStateAsync(LoadState.NetworkIdle, new PageWaitForLoadStateOptions
            {
                Timeout = TimeoutMilliseconds
            });

            var coverageEntries = await page.Coverage.StopCSSCoverageAsync();
            var limitedEntries = coverageEntries.Take(MaxPagesPerScan).ToArray();

            var totalCss = limitedEntries.Sum(entry => entry.Text.Length);
            var usedCss = limitedEntries.Sum(entry => CalculateUsedCharacters(entry.Ranges));
            var unusedCss = Math.Max(0, totalCss - usedCss);
            var cssContent = string.Join('\n', limitedEntries.Select(entry => entry.Text));

            return new CssCoverageResult
            {
                TotalCss = totalCss,
                UsedCss = usedCss,
                UnusedCss = unusedCss,
                CssContent = cssContent,
                PagesScanned = Math.Min(1, MaxPagesPerScan)
            };
        }
        finally
        {
            await page.CloseAsync();
        }
    }

    private static int CalculateUsedCharacters(IReadOnlyList<CoverageEntryRange> ranges)
    {
        if (ranges.Count == 0)
        {
            return 0;
        }

        var orderedRanges = ranges
            .OrderBy(range => range.Start)
            .ThenBy(range => range.End)
            .ToArray();

        var used = 0;
        var currentStart = orderedRanges[0].Start;
        var currentEnd = orderedRanges[0].End;

        for (var i = 1; i < orderedRanges.Length; i++)
        {
            var range = orderedRanges[i];
            if (range.Start <= currentEnd)
            {
                currentEnd = Math.Max(currentEnd, range.End);
                continue;
            }

            used += Math.Max(0, currentEnd - currentStart);
            currentStart = range.Start;
            currentEnd = range.End;
        }

        used += Math.Max(0, currentEnd - currentStart);
        return used;
    }
}

public sealed class CssCoverageResult
{
    public int TotalCss { get; init; }

    public int UsedCss { get; init; }

    public int UnusedCss { get; init; }

    public int PagesScanned { get; init; }

    public string CssContent { get; init; } = string.Empty;
}
