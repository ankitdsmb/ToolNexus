using System.Text.Json;
using Microsoft.Playwright;

namespace ToolNexus.Web.Services;

public sealed class CssCoverageService
{
    private const float TimeoutMilliseconds = 10_000;

    public async Task<CssCoverageResult> Analyze(string url)
    {
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
            var cdpSession = await page.Context.NewCDPSessionAsync(page);

            await cdpSession.SendAsync("CSS.enable");
            await cdpSession.SendAsync("DOM.enable");

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

            var stopTrackingResponse = await cdpSession.SendAsync("CSS.stopRuleUsageTracking");

            var (totalCss, usedCss) = CalculateRuleUsage(stopTrackingResponse);
            var unusedCss = Math.Max(0, totalCss - usedCss);

            return new CssCoverageResult
            {
                TotalCss = totalCss,
                UsedCss = usedCss,
                UnusedCss = unusedCss
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

    public int UnusedCss { get; set; }
}
