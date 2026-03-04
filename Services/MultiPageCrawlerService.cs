using Microsoft.Playwright;

namespace ToolNexus.Web.Services;

public sealed class MultiPageCrawlerService
{
    private const float TimeoutMilliseconds = 10_000;

    public async Task<List<string>> CrawlAsync(string startUrl, int maxPages = 5, CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(startUrl, UriKind.Absolute, out var startUri)
            || (startUri.Scheme != Uri.UriSchemeHttp && startUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("A valid http/https URL is required.", nameof(startUrl));
        }

        var targetLimit = Math.Clamp(maxPages, 1, 5);
        var domain = startUri.Host;

        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions { Headless = true });
        await using var context = await browser.NewContextAsync();

        context.SetDefaultTimeout(TimeoutMilliseconds);
        context.SetDefaultNavigationTimeout(TimeoutMilliseconds);

        var queue = new Queue<string>();
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var discovered = new List<string>();

        queue.Enqueue(startUri.ToString());

        while (queue.Count > 0 && discovered.Count < targetLimit)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var current = queue.Dequeue();

            if (!visited.Add(Normalize(current)))
            {
                continue;
            }

            var page = await context.NewPageAsync();
            try
            {
                await page.GotoAsync(current, new PageGotoOptions
                {
                    WaitUntil = WaitUntilState.DOMContentLoaded,
                    Timeout = TimeoutMilliseconds
                });

                discovered.Add(current);

                if (discovered.Count >= targetLimit)
                {
                    continue;
                }

                var hrefs = await page.EvaluateAsync<string[]>("() => Array.from(document.querySelectorAll(\"a[href]\"), a => a.getAttribute(\"href\") || \"\")");
                foreach (var href in hrefs)
                {
                    if (string.IsNullOrWhiteSpace(href))
                    {
                        continue;
                    }

                    if (!Uri.TryCreate(new Uri(current), href, out var resolved)
                        || (resolved.Scheme != Uri.UriSchemeHttp && resolved.Scheme != Uri.UriSchemeHttps)
                        || !resolved.Host.Equals(domain, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var normalized = Normalize(resolved.ToString());
                    if (visited.Contains(normalized) || queue.Any(q => Normalize(q) == normalized))
                    {
                        continue;
                    }

                    queue.Enqueue(resolved.ToString());
                }
            }
            catch
            {
                // Best-effort crawling.
            }
            finally
            {
                await page.CloseAsync();
            }
        }

        return discovered;
    }

    private static string Normalize(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return url;
        }

        var builder = new UriBuilder(uri) { Fragment = string.Empty };
        var normalized = builder.Uri.ToString();
        return normalized.EndsWith('/') ? normalized.TrimEnd('/') : normalized;
    }
}
