using System.Text.Json;
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
                WaitUntil = WaitUntilState.Commit
            });

            await cdpSession.SendAsync("CSS.startRuleUsageTracking");

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

    private static (int TotalCss, int UsedCss) CalculateRuleUsage(JsonElement? response)
    {
        if (response is null || !response.Value.TryGetProperty("ruleUsage", out var ruleUsage) || ruleUsage.ValueKind != JsonValueKind.Array)
        {
            return (0, 0);
        }

        var totalCss = 0;
        var usedCss = 0;

        foreach (var rule in ruleUsage.EnumerateArray())
        {
            totalCss++;

            if (rule.TryGetProperty("used", out var usedProperty) && usedProperty.ValueKind == JsonValueKind.True)
            {
                usedCss++;
            }
        }

        return (totalCss, usedCss);
    }
}

public sealed class CssCoverageResult
{
    public int TotalCss { get; set; }

    public int UsedCss { get; set; }

    public int UnusedCss { get; init; }

    public int PagesScanned { get; init; }

    public string CssContent { get; init; } = string.Empty;
}
