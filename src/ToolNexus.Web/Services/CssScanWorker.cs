using System.Text;
using AngleSharp.Html.Parser;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Web.Services;

public sealed class CssScanWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<CssScanWorker> logger) : BackgroundService
{
    private const int MaxConcurrentScans = 3;
    private const int MaxPagesPerScan = 5;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);
    private readonly SemaphoreSlim _concurrencyGate = new(MaxConcurrentScans, MaxConcurrentScans);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PumpQueue(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "scan_failed queue_pump");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task PumpQueue(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();

        var availableSlots = MaxConcurrentScans - CurrentLoad();
        if (availableSlots <= 0)
        {
            return;
        }

        var pendingJobs = await db.CssScanJobs
            .Where(job => job.Status == "Pending")
            .OrderBy(job => job.CreatedAtUtc)
            .Take(availableSlots)
            .ToListAsync(cancellationToken);

        foreach (var job in pendingJobs)
        {
            job.Status = "Processing";
            job.StartedAtUtc = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var job in pendingJobs)
        {
            _ = Task.Run(() => ProcessJobAsync(job.Id, cancellationToken), cancellationToken);
        }
    }

    private int CurrentLoad() => MaxConcurrentScans - _concurrencyGate.CurrentCount;

    private async Task ProcessJobAsync(Guid jobId, CancellationToken cancellationToken)
    {
        await _concurrencyGate.WaitAsync(cancellationToken);
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
            var crawler = scope.ServiceProvider.GetRequiredService<MultiPageCrawlerService>();
            var coverage = scope.ServiceProvider.GetRequiredService<CssCoverageService>();
            var selectorCoverage = scope.ServiceProvider.GetRequiredService<SelectorCoverageService>();
            var optimizer = scope.ServiceProvider.GetRequiredService<CssOptimizerService>();
            var frameworkDetector = scope.ServiceProvider.GetRequiredService<CssFrameworkDetector>();
            var artifactStorage = scope.ServiceProvider.GetRequiredService<CssArtifactStorageService>();
            var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();

            var job = await db.CssScanJobs.SingleAsync(x => x.Id == jobId, cancellationToken);
            logger.LogInformation("scan_started JobId={JobId} Url={Url}", jobId, job.Url);

            var crawl = await crawler.CrawlAsync(job.Url, maxPages: MaxPagesPerScan, cancellationToken: cancellationToken);
            var coverageResult = await coverage.Analyze(job.Url, cancellationToken);
            var cssPayload = await AggregateCssAsync(job.Url, crawl.Pages, httpClientFactory.CreateClient(), cancellationToken);
            var selectorResult = await selectorCoverage.AnalyzeAsync(job.Url, cssPayload, cancellationToken);
            var allSelectors = selectorCoverage.ExtractSelectors(cssPayload);
            var usedSelectors = allSelectors.Except(selectorResult.UnusedSelectorList).ToHashSet(StringComparer.Ordinal);
            var optimized = optimizer.GenerateOptimizedCss(cssPayload, usedSelectors);
            var framework = frameworkDetector.DetectFramework(cssPayload);

            var result = new CssScanResult
            {
                Id = Guid.NewGuid(),
                JobId = job.Id,
                TotalCssBytes = optimized.OriginalSize,
                UsedCssBytes = coverageResult.TotalRules == 0
                    ? 0
                    : (int)Math.Round(optimized.OriginalSize * ((double)coverageResult.UsedRules / coverageResult.TotalRules)),
                UnusedCssBytes = coverageResult.TotalRules == 0
                    ? 0
                    : (int)Math.Round(optimized.OriginalSize * ((double)coverageResult.UnusedRules / coverageResult.TotalRules)),
                OptimizationPotential = coverageResult.TotalRules == 0
                    ? 0
                    : Math.Round((double)coverageResult.UnusedRules / coverageResult.TotalRules, 4),
                Framework = framework.Framework,
                OptimizedCss = optimized.OptimizedCss,
                CreatedAtUtc = DateTimeOffset.UtcNow
            };

            foreach (var selector in allSelectors)
            {
                result.SelectorMetrics.Add(new CssSelectorMetric
                {
                    Id = Guid.NewGuid(),
                    Selector = selector,
                    IsUsed = !selectorResult.UnusedSelectorList.Contains(selector, StringComparer.Ordinal),
                    ResultId = result.Id
                });
            }

            var artifactPath = await artifactStorage.SaveOptimizedCssAsync(job.Id, optimized.OptimizedCss, cancellationToken);
            result.Artifacts.Add(new CssArtifact
            {
                Id = Guid.NewGuid(),
                ResultId = result.Id,
                ArtifactType = "optimized_css",
                FilePath = artifactPath,
                ContentType = "text/css",
                FileName = artifactStorage.GetDownloadFileName(job.Id),
                CreatedAtUtc = DateTimeOffset.UtcNow
            });

            db.CssScanResults.Add(result);
            job.Status = "Completed";
            job.CompletedAtUtc = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("scan_completed JobId={JobId} Url={Url} Pages={Pages}", jobId, job.Url, crawl.PagesScanned);
        }
        catch (Exception ex)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
            var job = await db.CssScanJobs.SingleOrDefaultAsync(x => x.Id == jobId, cancellationToken);
            if (job is not null)
            {
                job.Status = "Failed";
                job.ErrorMessage = ex.Message;
                job.CompletedAtUtc = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
            }

            logger.LogError(ex, "scan_failed JobId={JobId}", jobId);
        }
        finally
        {
            _concurrencyGate.Release();
        }
    }

    private static async Task<string> AggregateCssAsync(string baseUrl, IEnumerable<string> pages, HttpClient client, CancellationToken cancellationToken)
    {
        var parser = new HtmlParser();
        var collectedCss = new StringBuilder();
        var baseUri = new Uri(baseUrl);

        foreach (var pagePath in pages.Take(MaxPagesPerScan))
        {
            var pageUri = Uri.TryCreate(baseUri, pagePath, out var resolvedPage) ? resolvedPage : baseUri;
            var html = await client.GetStringAsync(pageUri, cancellationToken);
            var document = await parser.ParseDocumentAsync(html, cancellationToken);

            foreach (var styleTag in document.QuerySelectorAll("style"))
            {
                collectedCss.AppendLine(styleTag.TextContent);
            }

            foreach (var linkTag in document.QuerySelectorAll("link[rel='stylesheet']"))
            {
                var href = linkTag.GetAttribute("href");
                if (string.IsNullOrWhiteSpace(href))
                {
                    continue;
                }

                if (!Uri.TryCreate(pageUri, href, out var stylesheetUri))
                {
                    continue;
                }

                try
                {
                    var css = await client.GetStringAsync(stylesheetUri, cancellationToken);
                    collectedCss.AppendLine(css);
                }
                catch
                {
                    // Best effort only.
                }
            }
        }

        return collectedCss.ToString();
    }
}
