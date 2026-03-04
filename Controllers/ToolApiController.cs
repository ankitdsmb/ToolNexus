using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
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
    IServiceProvider serviceProvider) : ControllerBase
{
    [HttpPost("css/analyze")]
    public async Task<IActionResult> AnalyzeCss([FromBody] CssAnalyzeRequest request, CancellationToken cancellationToken)
    {
        if (!TryValidateHttpUrl(request?.Url, out var normalizedUrl))
        {
            return BadRequest(new { error = "A valid http/https URL is required." });
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
        if (!TryValidateHttpUrl(request?.Url, out var normalizedUrl))
        {
            return BadRequest(new { error = "A valid http/https URL is required." });
        }

        var optimizerType = Type.GetType("ToolNexus.Web.Services.CssOptimizerService, ToolNexus.Web", throwOnError: false);
        if (optimizerType is null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "CssOptimizerService is not available." });
        }

        var optimizer = serviceProvider.GetService(optimizerType);
        if (optimizer is null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "CssOptimizerService is not configured." });
        }

        var optimizeMethod = optimizerType.GetMethod("Optimize", new[] { typeof(string), typeof(CancellationToken) });
        if (optimizeMethod is null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "CssOptimizerService.Optimize was not found." });
        }

        var optimizedCssTask = optimizeMethod.Invoke(optimizer, new object[] { normalizedUrl, cancellationToken }) as Task<string>;
        if (optimizedCssTask is null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "CssOptimizerService.Optimize returned an invalid result." });
        }

        var optimizedCss = await optimizedCssTask;
        var cssBytes = System.Text.Encoding.UTF8.GetBytes(optimizedCss);

        return File(cssBytes, "application/css", "optimized.css");
    }

    [HttpPost("critical-css")]
    public async Task<IActionResult> CriticalCss([FromBody] CriticalCssRequest request)
    {
        if (!TryValidateHttpUrl(request?.Url, out var normalizedUrl))
        {
            return BadRequest(new { error = "A valid http/https URL is required." });
        }

        var css = await criticalCssService.Generate(normalizedUrl);
        var cssBytes = System.Text.Encoding.UTF8.GetBytes(css);

        return File(cssBytes, "text/css", "critical.css");
    }

    [HttpPost("css-compare")]
    public async Task<IActionResult> CssCompare([FromBody] CssCompareRequest request, CancellationToken cancellationToken)
    {
        if (!TryValidateHttpUrl(request?.UrlA, out var urlA)
            || !TryValidateHttpUrl(request.UrlB, out var urlB))
        {
            return BadRequest(new { error = "Two valid http/https URLs are required." });
        }

        const int maxPagesPerScan = 5;
        if (2 > maxPagesPerScan)
        {
            return BadRequest(new { error = "Maximum pages per scan exceeded." });
        }

        var comparisonResult = await cssComparisonService.CompareAsync(urlA, urlB, cancellationToken);
        return Ok(comparisonResult);
    }

    private static bool TryValidateHttpUrl(string? url, out string normalizedUrl)
    {
        normalizedUrl = string.Empty;

        if (string.IsNullOrWhiteSpace(url)
            || !Uri.TryCreate(url, UriKind.Absolute, out var parsed)
            || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            return false;
        }

        normalizedUrl = parsed.ToString();
        return true;
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
