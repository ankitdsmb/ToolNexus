using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Web.Services;

public sealed class CssScanCacheService(
    ToolNexusContentDbContext dbContext,
    IPlatformCacheService platformCache)
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(24);

    public async Task<string?> GetCachedResult(string url, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        var cacheKey = BuildCacheKey(url);
        return await platformCache.GetOrCreateAsync(
            cacheKey,
            ct => LoadLatestResultPayload(url, ct),
            CacheLifetime,
            cancellationToken);
    }

    public async Task SaveResult(string url, string result, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ArgumentNullException.ThrowIfNull(result);

        var cacheKey = BuildCacheKey(url);
        await platformCache.RemoveAsync(cacheKey, cancellationToken);
        await platformCache.GetOrCreateAsync(
            cacheKey,
            _ => Task.FromResult<string?>(result),
            CacheLifetime,
            cancellationToken);
    }

    private async Task<string?> LoadLatestResultPayload(string url, CancellationToken cancellationToken)
    {
        var latestResult = await dbContext.CssScanResults
            .AsNoTracking()
            .Where(x => x.Job != null && x.Job.Url == url)
            .OrderByDescending(x => x.Job!.CompletedAtUtc ?? x.CreatedAtUtc)
            .Select(x => new
            {
                x.TotalCssBytes,
                x.UsedCssBytes,
                x.UnusedCssBytes,
                x.OptimizationPotential,
                x.Framework,
                x.FrameworkDetectionJson
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (latestResult is null)
        {
            return null;
        }

        return JsonSerializer.Serialize(new
        {
            summary = new
            {
                totalCss = latestResult.TotalCssBytes,
                usedCss = latestResult.UsedCssBytes,
                unusedCss = latestResult.UnusedCssBytes,
                optimizationPotential = latestResult.OptimizationPotential
            },
            frameworkInfo = new
            {
                name = latestResult.Framework,
                detection = ParseFrameworkDetection(latestResult.FrameworkDetectionJson)
            },
            sizeMetrics = new
            {
                totalCssBytes = latestResult.TotalCssBytes,
                usedCssBytes = latestResult.UsedCssBytes,
                unusedCssBytes = latestResult.UnusedCssBytes
            },
            totalCss = latestResult.TotalCssBytes,
            usedCss = latestResult.UsedCssBytes,
            unusedCss = latestResult.UnusedCssBytes,
            frameworkName = latestResult.Framework,
            detectedFramework = latestResult.Framework,
            framework = latestResult.Framework
        });
    }

    private static object? ParseFrameworkDetection(string? frameworkDetectionJson)
    {
        if (string.IsNullOrWhiteSpace(frameworkDetectionJson))
        {
            return null;
        }

        using var json = JsonDocument.Parse(frameworkDetectionJson);
        return json.RootElement.Clone();
    }

    private static string BuildCacheKey(string url)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(url));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
        return $"css-scan:{hash}";
    }
}
