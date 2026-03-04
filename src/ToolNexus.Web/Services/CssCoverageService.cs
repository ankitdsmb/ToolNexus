using Microsoft.Playwright;

namespace ToolNexus.Web.Services;

public sealed class CssCoverageService
{
    private const float TimeoutMilliseconds = 15_000;

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
        var cdpSession = await page.Context.NewCDPSessionAsync(page);

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            await cdpSession.SendAsync("DOM.enable");
            await cdpSession.SendAsync("CSS.enable");
            await cdpSession.SendAsync("CSS.startRuleUsageTracking");

            await page.GotoAsync(url, new PageGotoOptions
            {
                Timeout = TimeoutMilliseconds,
                WaitUntil = WaitUntilState.NetworkIdle
            });

            var result = await cdpSession.SendAsync("CSS.stopRuleUsageTracking");
            var rules = result.Value.GetProperty("ruleUsage");

            var used = 0;
            var unused = 0;

            foreach (var rule in rules.EnumerateArray())
            {
                if (rule.TryGetProperty("used", out var isUsed) && isUsed.GetBoolean())
                {
                    used++;
                }
                else
                {
                    unused++;
                }
            }

            return new CssCoverageResult
            {
                UsedRules = used,
                UnusedRules = unused,
                TotalRules = used + unused
            };
        }
        finally
        {
            await page.CloseAsync();
        }
    }

}

public sealed class CssCoverageResult
{
    public int UsedRules { get; init; }

    public int UnusedRules { get; init; }

    public int TotalRules { get; init; }
}
