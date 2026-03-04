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
    CssScanCacheService cssScanCacheService) : ControllerBase
{
    [HttpPost("css-analyze")]
    public async Task<IActionResult> CssAnalyze([FromBody] CssAnalyzeRequest request, CancellationToken cancellationToken)
    {
        if (!TryValidateHttpUrl(request?.Url, out var normalizedUrl))
        {
            return BadRequest(new { error = "A valid http/https URL is required." });
        }

        var cachedResult = await cssScanCacheService.GetCachedResult(normalizedUrl, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cachedResult))
        {
            return Content(cachedResult, "application/json");
        }

        var coverageResult = await cssCoverageService.Analyze(normalizedUrl, cancellationToken);
        var analysisResult = cssAnalysisService.Process(coverageResult);

        var serialized = JsonSerializer.Serialize(analysisResult);
        await cssScanCacheService.SaveResult(normalizedUrl, serialized, cancellationToken);

        return Ok(analysisResult);
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
}
