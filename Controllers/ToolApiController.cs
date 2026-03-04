using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

[ApiController]
[Route("api/tools")]
public sealed class ToolApiController(
    CssCoverageService cssCoverageService,
    CssAnalysisService cssAnalysisService,
    CssComparisonService cssComparisonService,
    CriticalCssService criticalCssService,
    CssScanCacheService cssScanCacheService,
    CssOptimizerService cssOptimizerService,
    UrlSecurityValidator urlSecurityValidator) : ControllerBase
{
    private static readonly ConcurrentDictionary<string, List<DateTime>> RequestLog = new(StringComparer.OrdinalIgnoreCase);
    private static readonly TimeSpan RateWindow = TimeSpan.FromHours(1);
    private const int MaxRequestsPerWindow = 5;

    [HttpPost("css/analyze")]
    public async Task<IActionResult> AnalyzeCss([FromBody] CssAnalyzeRequest request, CancellationToken cancellationToken)
    {
        if (IsRateLimited(GetClientIp()))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = "Rate limit exceeded. Maximum 5 scans per hour." });
        }

        string normalizedUrl;
        try
        {
            normalizedUrl = urlSecurityValidator.ValidateAndNormalize(request?.Url);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var cachedResult = await cssScanCacheService.GetCachedResult(normalizedUrl, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cachedResult))
        {
            var cachedAnalysis = JsonSerializer.Deserialize<CssAnalysisResult>(cachedResult);
            if (cachedAnalysis is not null)
            {
                return Ok(ToAnalyzeResponse(cachedAnalysis));
            }
        }

        var coverageResult = await cssCoverageService.Analyze(normalizedUrl, cancellationToken);
        var analysisResult = cssAnalysisService.Process(coverageResult);

        var serialized = JsonSerializer.Serialize(analysisResult);
        await cssScanCacheService.SaveResult(normalizedUrl, serialized, cancellationToken);

        return Ok(ToAnalyzeResponse(analysisResult));
    }

    [HttpPost("css-analyze")]
    public async Task<IActionResult> CssAnalyze([FromBody] CssAnalyzeRequest request, CancellationToken cancellationToken)
        => await AnalyzeCss(request, cancellationToken);

    [HttpPost("css/download")]
    public async Task<IActionResult> DownloadOptimizedCss([FromBody] CssAnalyzeRequest request, CancellationToken cancellationToken)
    {
        if (IsRateLimited(GetClientIp()))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = "Rate limit exceeded. Maximum 5 scans per hour." });
        }

        string normalizedUrl;
        try
        {
            normalizedUrl = urlSecurityValidator.ValidateAndNormalize(request?.Url);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var optimizedCss = await cssOptimizerService.Optimize(normalizedUrl, cancellationToken);
        var cssBytes = Encoding.UTF8.GetBytes(optimizedCss);

        Response.Headers.ContentDisposition = "attachment; filename=optimized.css";
        return File(cssBytes, "text/css", "optimized.css");
    }

    [HttpPost("critical-css")]
    public async Task<IActionResult> CriticalCss([FromBody] CriticalCssRequest request)
    {
        string normalizedUrl;
        try
        {
            normalizedUrl = urlSecurityValidator.ValidateAndNormalize(request?.Url);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var css = await criticalCssService.Generate(normalizedUrl);
        var cssBytes = Encoding.UTF8.GetBytes(css);

        return File(cssBytes, "text/css", "critical.css");
    }

    [HttpPost("css-compare")]
    public async Task<IActionResult> CssCompare([FromBody] CssCompareRequest request, CancellationToken cancellationToken)
    {
        if (IsRateLimited(GetClientIp()))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = "Rate limit exceeded. Maximum 5 scans per hour." });
        }

        string urlA;
        string urlB;
        try
        {
            urlA = urlSecurityValidator.ValidateAndNormalize(request?.UrlA);
            urlB = urlSecurityValidator.ValidateAndNormalize(request?.UrlB);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var comparisonResult = await cssComparisonService.CompareAsync(urlA, urlB, cancellationToken);
        return Ok(comparisonResult);
    }

    private static bool IsRateLimited(string ip)
    {
        var now = DateTime.UtcNow;
        var entries = RequestLog.GetOrAdd(ip, _ => []);

        lock (entries)
        {
            entries.RemoveAll(ts => ts <= now - RateWindow);
            if (entries.Count >= MaxRequestsPerWindow)
            {
                return true;
            }

            entries.Add(now);
            return false;
        }
    }

    private string GetClientIp()
    {
        if (HttpContext.Connection.RemoteIpAddress is null)
        {
            return "unknown";
        }

        return HttpContext.Connection.RemoteIpAddress.ToString();
    }

    public sealed record CssAnalyzeRequest(string Url);
    public sealed record CriticalCssRequest(string Url);
    public sealed record CssCompareRequest(string UrlA, string UrlB);

    private static object ToAnalyzeResponse(CssAnalysisResult analysisResult)
        => new
        {
            usedCss = analysisResult.UsedCss,
            unusedCss = analysisResult.UnusedCss,
            optimizationPotential = analysisResult.TotalCss <= 0
                ? 0
                : Math.Round((double)analysisResult.UnusedCss / analysisResult.TotalCss, 2, MidpointRounding.AwayFromZero),
            framework = analysisResult.FrameworkDetected
        };
}
