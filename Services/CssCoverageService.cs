using System.Text;
using Microsoft.Playwright;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Services;

public sealed class CssCoverageService(
    MultiPageCrawlerService crawlerService,
    UrlSecurityValidator urlSecurityValidator,
    CssFrameworkDetector frameworkDetector)
{
    private const int MaxPagesPerScan = 5;
    private const float TimeoutMilliseconds = 15_000;

    private static readonly SemaphoreSlim BrowserInitLock = new(1, 1);
    private static IBrowser? _browser;
    private static IPlaywright? _playwright;
    private static readonly SemaphoreSlim _scanLimiter = new SemaphoreSlim(3);

    public async Task<CssCoverageResult> Analyze(string url, CancellationToken cancellationToken = default)
    {
        var normalizedUrl = urlSecurityValidator.ValidateAndNormalize(url);

        await _scanLimiter.WaitAsync(cancellationToken);
        try
        {
            await EnsureBrowserAsync();

            var pagesToScan = await crawlerService.CrawlAsync(normalizedUrl, MaxPagesPerScan, cancellationToken);
            if (pagesToScan.Count == 0)
            {
                pagesToScan.Add(normalizedUrl);
            }

            var usedRules = 0;
            var unusedRules = 0;
            var cssBuilder = new StringBuilder();
            var usedSelectors = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var pageUrl in pagesToScan)
            {
                cancellationToken.ThrowIfCancellationRequested();

                await using var context = await _browser!.NewContextAsync();
                context.SetDefaultNavigationTimeout(TimeoutMilliseconds);
                context.SetDefaultTimeout(TimeoutMilliseconds);

                await context.RouteAsync("**/*", async route =>
                {
                    var resourceType = route.Request.ResourceType;
                    if (resourceType is "image" or "media" or "font")
                    {
                        await route.AbortAsync();
                        return;
                    }

                    await route.ContinueAsync();
                });

                var page = await context.NewPageAsync();
                var cdpSession = await page.Context.NewCDPSessionAsync(page);

                try
                {
                    await cdpSession.SendAsync("DOM.enable");
                    await cdpSession.SendAsync("CSS.enable");
                    await cdpSession.SendAsync("CSS.startRuleUsageTracking");

                    await page.GotoAsync(pageUrl, new PageGotoOptions
                    {
                        Timeout = TimeoutMilliseconds,
                        WaitUntil = WaitUntilState.DOMContentLoaded
                    });

                    var result = await cdpSession.SendAsync("CSS.stopRuleUsageTracking");
                    var rules = result.Value.GetProperty("ruleUsage");

                    foreach (var rule in rules.EnumerateArray())
                    {
                        if (rule.TryGetProperty("used", out var isUsed) && isUsed.GetBoolean())
                        {
                            usedRules++;
                        }
                        else
                        {
                            unusedRules++;
                        }
                    }

                    var cssText = await page.EvaluateAsync<string>(@"() => {
                        const chunks = [];
                        for (const sheet of Array.from(document.styleSheets)) {
                            try {
                                for (const rule of Array.from(sheet.cssRules || [])) {
                                    chunks.push(rule.cssText || '');
                                }
                            } catch {
                            }
                        }
                        return chunks.join('\n');
                    }");

                    if (!string.IsNullOrWhiteSpace(cssText))
                    {
                        cssBuilder.AppendLine(cssText);
                    }

                    var selectorSignals = await page.EvaluateAsync<string[]>(@"() => {
                        const selectors = new Set();
                        for (const el of Array.from(document.querySelectorAll('*'))) {
                            if (el.id) selectors.add('#' + el.id);
                            for (const cls of Array.from(el.classList || [])) selectors.add('.' + cls);
                            if (el.tagName) selectors.add(el.tagName.toLowerCase());
                        }
                        return Array.from(selectors);
                    }");

                    foreach (var selector in selectorSignals)
                    {
                        usedSelectors.Add(selector);
                    }
                }
                finally
                {
                    await page.CloseAsync();
                }
            }

            var cssContent = cssBuilder.ToString();
            var framework = frameworkDetector.Detect(cssContent).Framework;

            return new CssCoverageResult
            {
                TotalCss = usedRules + unusedRules,
                UsedCss = usedRules,
                UnusedCss = unusedRules,
                UsedSelectors = usedSelectors,
                CssContent = cssContent,
                PagesScanned = pagesToScan.Count,
                FrameworkDetected = framework
            };
        }
        finally
        {
            _scanLimiter.Release();
        }
    }

    private async Task EnsureBrowserAsync()
    {
        if (_browser is not null && _browser.IsConnected)
        {
            return;
        }

        await BrowserInitLock.WaitAsync();
        try
        {
            if (_browser is not null && _browser.IsConnected)
            {
                return;
            }

            _playwright ??= await Playwright.CreateAsync();
            _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = true
            });
        }
        finally
        {
            BrowserInitLock.Release();
        }
    }
}

public sealed class CssCoverageResult
{
    public int TotalCss { get; init; }
    public int UsedCss { get; init; }
    public int UnusedCss { get; init; }
    public int PagesScanned { get; init; }
    public string CssContent { get; init; } = string.Empty;
    public string FrameworkDetected { get; init; } = "None";
    public ISet<string> UsedSelectors { get; init; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
}
