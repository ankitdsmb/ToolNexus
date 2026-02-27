using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/governance/quality-scores")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class QualityScoresController(IToolQualityScoreService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ToolQualityScoreDashboard>> GetScores(
        [FromQuery] int limit = 100,
        [FromQuery] string? toolId = null,
        [FromQuery] DateTime? startDateUtc = null,
        [FromQuery] DateTime? endDateUtc = null,
        CancellationToken cancellationToken = default)
    {
        var result = await service.GetDashboardAsync(
            new ToolQualityScoreQuery(limit, toolId, startDateUtc, endDateUtc),
            cancellationToken);

        return Ok(result);
    }
}
