using Microsoft.AspNetCore.Mvc;

namespace ToolNexus.Web.Controllers;

[ApiController]
[Route("api/tools")]
public sealed class ToolApiController(CssAnalysisService cssAnalysisService) : ControllerBase
{
    [HttpPost("css-analyze")]
    public async Task<IActionResult> CssAnalyze([FromBody] CssAnalyzeRequest request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { error = "A valid url is required." });
        }

        var analysis = await cssAnalysisService.AnalyzeAsync(request.Url, cancellationToken);

        return Ok(new
        {
            totalCssKb = analysis.TotalCssKb,
            usedCssKb = analysis.UsedCssKb,
            unusedCssKb = analysis.UnusedCssKb,
            efficiencyScore = analysis.EfficiencyScore,
            framework = analysis.Framework
        });
    }

    public sealed record CssAnalyzeRequest(string Url);
}
