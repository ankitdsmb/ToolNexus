using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Net;
using AngleSharp.Html.Parser;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Services;

public sealed class CssScanWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<CssScanWorker> logger,
    IMetricsCollector metricsCollector) : BackgroundService
{
    private const int MaxConcurrentScans = 3;
    private const int MaxPagesPerScan = 5;
    private const int MaxAttempts = 3;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan ScanTimeout = TimeSpan.FromSeconds(120);
    private static readonly TimeSpan[] RetryBackoff =
    [
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(10)
    ];

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
        var now = DateTimeOffset.UtcNow;

        var queueDepth = await db.CssScanJobs
            .Where(job => job.Status == "Pending" || job.Status == "Processing")
            .CountAsync(cancellationToken);
        metricsCollector.SetCssScanQueueDepth(queueDepth);

        var availableSlots = MaxConcurrentScans - CurrentLoad();
        if (availableSlots <= 0)
        {
            return;
        }

        var pendingJobs = await db.CssScanJobs
            .Where(job => job.Status == "Pending")
            .OrderBy(job => job.CreatedAtUtc)
            .Take(availableSlots * 3)
            .ToListAsync(cancellationToken);

        var runnableJobs = pendingJobs
            .Where(job => !TryGetMetadata(job.JobMetadataJson, out var metadata) || metadata.NextAttemptAtUtc is null || metadata.NextAttemptAtUtc <= now)
            .Take(availableSlots)
            .ToList();

        foreach (var job in runnableJobs)
        {
            job.Status = "Processing";
            job.StartedAtUtc = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var job in runnableJobs)
        {
            _ = Task.Run(() => ProcessJobAsync(job.Id, cancellationToken), cancellationToken);
        }
    }

    private int CurrentLoad() => MaxConcurrentScans - _concurrencyGate.CurrentCount;

    private async Task ProcessJobAsync(Guid jobId, CancellationToken cancellationToken)
    {
        await _concurrencyGate.WaitAsync(cancellationToken);
        var scanStopwatch = Stopwatch.StartNew();
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
            var privateNetworkValidator = scope.ServiceProvider.GetRequiredService<IPrivateNetworkValidator>();

            var job = await db.CssScanJobs.SingleAsync(x => x.Id == jobId, cancellationToken);
            var metadata = GetMetadata(job.JobMetadataJson);
            var attempt = metadata.Attempt + 1;

            var jobMetadata = DeserializeMetadata(job.JobMetadataJson);
            var baseUri = new Uri(job.Url);
            var pinnedAddress = await ResolveInitialPinnedAddressAsync(baseUri, jobMetadata, privateNetworkValidator, cancellationToken);

            var crawl = await crawler.CrawlAsync(job.Url, maxPages: MaxPagesPerScan, cancellationToken: cancellationToken);
            var coverageResult = await coverage.Analyze(job.Url, cancellationToken);
            var cssPayload = await AggregateCssAsync(job.Url, crawl.Pages, pinnedAddress, privateNetworkValidator, cancellationToken);
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

            var artifactPath = await artifactStorage.SaveOptimizedCssAsync(job.Id, optimized.OptimizedCss, scanToken);
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
            job.ErrorMessage = null;
            job.JobMetadataJson = SerializeMetadata(new ScanJobMetadata(0, null));
            job.CompletedAtUtc = DateTimeOffset.UtcNow;
            job.PagesScanned = crawl.PagesScanned;
            job.ScanDurationMs = (int)Math.Round(scanStopwatch.Elapsed.TotalMilliseconds);
            await db.SaveChangesAsync(cancellationToken);

            metricsCollector.ObserveCssScanDuration(scanStopwatch.Elapsed.TotalMilliseconds);
            logger.LogInformation("scan_completed EventName={EventName} JobId={JobId} Url={Url} Pages={Pages} Attempt={Attempt} DurationMs={DurationMs}", "scan_completed", jobId, job.Url, crawl.PagesScanned, attempt, job.ScanDurationMs);
        }
        catch (Exception ex)
        {
            var timedOut = ex is OperationCanceledException && !cancellationToken.IsCancellationRequested;

            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ToolNexusContentDbContext>();
            var job = await db.CssScanJobs.SingleOrDefaultAsync(x => x.Id == jobId, cancellationToken);
            if (job is not null)
            {
                var metadata = GetMetadata(job.JobMetadataJson);
                var nextAttempt = metadata.Attempt + 1;

                job.ScanDurationMs = (int)Math.Round(scanStopwatch.Elapsed.TotalMilliseconds);

                if (nextAttempt < MaxAttempts)
                {
                    var retryDelay = RetryBackoff[Math.Min(nextAttempt - 1, RetryBackoff.Length - 1)];
                    var nextAttemptAt = DateTimeOffset.UtcNow.Add(retryDelay);
                    job.Status = "Pending";
                    job.ErrorMessage = $"Attempt {nextAttempt}/{MaxAttempts} failed: {ex.Message}";
                    job.JobMetadataJson = SerializeMetadata(new ScanJobMetadata(nextAttempt, nextAttemptAt));
                    job.CompletedAtUtc = null;

                    logger.LogWarning(ex,
                        "scan_failed EventName={EventName} JobId={JobId} Attempt={Attempt} MaxAttempts={MaxAttempts} RetryingInSeconds={RetryInSeconds} TimedOut={TimedOut}",
                        "scan_failed",
                        jobId,
                        nextAttempt,
                        MaxAttempts,
                        retryDelay.TotalSeconds,
                        timedOut);
                }
                else
                {
                    job.Status = "Failed";
                    job.ErrorMessage = timedOut
                        ? $"CSS scan timed out after {ScanTimeout.TotalSeconds:0}s"
                        : ex.Message;
                    job.CompletedAtUtc = DateTimeOffset.UtcNow;
                    job.JobMetadataJson = SerializeMetadata(new ScanJobMetadata(nextAttempt, null));

                    metricsCollector.IncrementCssScanFailure();
                    logger.LogError(ex,
                        "scan_failed EventName={EventName} JobId={JobId} Attempt={Attempt} MaxAttempts={MaxAttempts} TimedOut={TimedOut}",
                        "scan_failed",
                        jobId,
                        nextAttempt,
                        MaxAttempts,
                        timedOut);
                }

                await db.SaveChangesAsync(cancellationToken);
            }
        }
        finally
        {
            _concurrencyGate.Release();
        }
    }

    private static async Task<string> AggregateCssAsync(
        string baseUrl,
        IEnumerable<string> pages,
        IPAddress pinnedAddress,
        IPrivateNetworkValidator privateNetworkValidator,
        CancellationToken cancellationToken)
    {
        var parser = new HtmlParser();
        var collectedCss = new StringBuilder();
        var baseUri = new Uri(baseUrl);
        var fetcher = new PinnedHttpFetcher(privateNetworkValidator);

        foreach (var pagePath in pages.Take(MaxPagesPerScan))
        {
            var pageUri = Uri.TryCreate(baseUri, pagePath, out var resolvedPage) ? resolvedPage : baseUri;
            var html = await fetcher.GetStringAsync(pageUri, pinnedAddress, cancellationToken);
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
                    var stylesheetAddress = await privateNetworkValidator.ResolveValidatedAddressAsync(stylesheetUri.Host, cancellationToken);
                    if (stylesheetAddress is null)
                    {
                        continue;
                    }

                    var css = await fetcher.GetStringAsync(stylesheetUri, stylesheetAddress, cancellationToken);
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

    private static async Task<IPAddress> ResolveInitialPinnedAddressAsync(
        Uri targetUri,
        CssScanJobMetadata metadata,
        IPrivateNetworkValidator privateNetworkValidator,
        CancellationToken cancellationToken)
    {
        if (metadata.PinnedIp is not null && IPAddress.TryParse(metadata.PinnedIp, out var fromMetadata))
        {
            return fromMetadata;
        }

        var resolved = await privateNetworkValidator.ResolveValidatedAddressAsync(targetUri.Host, cancellationToken);
        if (resolved is null)
        {
            throw new InvalidOperationException("Target URL no longer resolves to a public IP.");
        }

        return resolved;
    }

    private static CssScanJobMetadata DeserializeMetadata(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            return new CssScanJobMetadata();
        }

        try
        {
            return JsonSerializer.Deserialize<CssScanJobMetadata>(metadataJson) ?? new CssScanJobMetadata();
        }
        catch
        {
            return new CssScanJobMetadata();
        }
    }

    private sealed record CssScanJobMetadata(string? PinnedIp = null);
}
