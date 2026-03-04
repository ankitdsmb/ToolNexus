using Microsoft.Playwright;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Services;

public sealed class MultiPageCrawlerService
{
    private const int DefaultMaxPages = 5;
    private const int DefaultMaxDepth = 2;
    private const float TimeoutMilliseconds = 10_000;

    public async Task<CrawlResult> CrawlAsync(
        string url,
        int maxPages = DefaultMaxPages,
        int maxDepth = DefaultMaxDepth,
        CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var startUri)
            || (startUri.Scheme != Uri.UriSchemeHttp && startUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("A valid http/https URL is required.", nameof(url));
        }

        var maxPagesLimit = Math.Max(1, Math.Min(DefaultMaxPages, maxPages));
        var maxDepthLimit = Math.Max(0, maxDepth);

        using var playwright = await Playwright.CreateAsync();
        await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = true
        });

        await using var context = await browser.NewContextAsync();
        context.SetDefaultNavigationTimeout(TimeoutMilliseconds);
        context.SetDefaultTimeout(TimeoutMilliseconds);

        var origin = new Uri(startUri.GetLeftPart(UriPartial.Authority));

        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var pages = new List<string>();
        var queue = new Queue<(Uri Uri, int Depth)>();

        queue.Enqueue((NormalizeForNavigation(startUri), 0));

        while (queue.Count > 0 && pages.Count < maxPagesLimit)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var (currentUri, depth) = queue.Dequeue();
            var currentKey = NormalizeForLookup(currentUri);

            if (!visited.Add(currentKey))
            {
                continue;
            }

            await using var page = await context.NewPageAsync();

            try
            {
                await page.GotoAsync(currentUri.ToString(), new PageGotoOptions
                {
                    WaitUntil = WaitUntilState.DOMContentLoaded,
                    Timeout = TimeoutMilliseconds
                });
            }
            catch
            {
                continue;
            }

            pages.Add(ToOutputPath(currentUri, origin));

            if (depth >= maxDepthLimit || pages.Count >= maxPagesLimit)
            {
                continue;
            }

            var discoveredHrefs = await page.EvaluateAsync<string[]>(
                "() => Array.from(document.querySelectorAll('a[href]'), anchor => anchor.getAttribute('href') ?? '')");

            foreach (var href in discoveredHrefs)
            {
                if (string.IsNullOrWhiteSpace(href))
                {
                    continue;
                }

                if (!TryResolveInternalUrl(currentUri, origin, href, out var resolved))
                {
                    continue;
                }

                var resolvedKey = NormalizeForLookup(resolved);

                if (visited.Contains(resolvedKey))
                {
                    continue;
                }

                queue.Enqueue((resolved, depth + 1));
            }
        }

        return new CrawlResult
        {
            PagesScanned = pages.Count,
            Pages = pages
        };
    }

    private static bool TryResolveInternalUrl(Uri currentUri, Uri origin, string href, out Uri resolved)
    {
        resolved = currentUri;

        if (href.StartsWith('#')
            || href.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase)
            || href.StartsWith("tel:", StringComparison.OrdinalIgnoreCase)
            || href.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!Uri.TryCreate(currentUri, href, out var candidate)
            || (candidate.Scheme != Uri.UriSchemeHttp && candidate.Scheme != Uri.UriSchemeHttps)
            || !Uri.Compare(candidate, origin, UriComponents.SchemeAndServer, UriFormat.Unescaped, StringComparison.OrdinalIgnoreCase).Equals(0))
        {
            return false;
        }

        resolved = NormalizeForNavigation(candidate);
        return true;
    }

    private static Uri NormalizeForNavigation(Uri uri)
    {
        var builder = new UriBuilder(uri)
        {
            Fragment = string.Empty
        };

        if (builder.Path.Length > 1 && builder.Path.EndsWith('/'))
        {
            builder.Path = builder.Path.TrimEnd('/');
        }

        return builder.Uri;
    }

    private static string NormalizeForLookup(Uri uri)
    {
        var normalized = NormalizeForNavigation(uri);
        return normalized.ToString().TrimEnd('/');
    }

    private static string ToOutputPath(Uri uri, Uri origin)
    {
        if (uri.AbsolutePath == "/" && string.IsNullOrEmpty(uri.Query))
        {
            return "/";
        }

        if (uri.Query.Length == 0)
        {
            return uri.AbsolutePath;
        }

        return $"{uri.AbsolutePath}{uri.Query}";
    }
}
