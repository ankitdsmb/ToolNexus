using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/architecture/evolution")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ArchitectureEvolutionController(IArchitectureEvolutionService service) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<EvolutionDashboard>> GetDashboard([FromQuery] int limit = 20, CancellationToken cancellationToken = default)
        => Ok(await service.GetDashboardAsync(limit, cancellationToken));

    [HttpPost("drift/detect")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<object>> DetectDrift(CancellationToken cancellationToken)
        => Ok(new { count = await service.RunDriftDetectionAsync(cancellationToken) });

    [HttpPost("recommendations/generate")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<object>> GenerateRecommendations(CancellationToken cancellationToken)
        => Ok(new { count = await service.GenerateRecommendationsAsync(cancellationToken) });

    [HttpPost("recommendations/{recommendationId:guid}/review")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<IActionResult> ReviewRecommendation(Guid recommendationId, [FromBody] ArchitectDecisionRequest request, CancellationToken cancellationToken)
        => await service.RecordArchitectDecisionAsync(recommendationId, request, cancellationToken) ? Ok() : NotFound();
}
