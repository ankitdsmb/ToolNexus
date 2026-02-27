using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/architecture/evolution")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ArchitectureEvolutionController(IArchitectureEvolutionService service, ILogger<ArchitectureEvolutionController> logger) : ControllerBase
{
    [HttpPost("signals")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<ArchitectureEvolutionSignal>> IngestSignal([FromBody] EvolutionSignalIngestRequest request, CancellationToken cancellationToken)
    {
        logger.LogInformation("Architecture evolution signal ingestion requested from web admin endpoint.");
        return Ok(await service.IngestSignalAsync(request, cancellationToken));
    }

    [HttpPost("drift/detect")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<object>> DetectDrift(CancellationToken cancellationToken)
    {
        logger.LogInformation("Architecture evolution drift detection requested from web admin endpoint.");
        return Ok(new { count = await service.RunDriftDetectionAsync(cancellationToken) });
    }

    [HttpPost("recommendations/generate")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<object>> GenerateRecommendations(CancellationToken cancellationToken)
    {
        logger.LogInformation("Architecture evolution recommendation generation requested from web admin endpoint.");
        return Ok(new { count = await service.GenerateRecommendationsAsync(cancellationToken) });
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<EvolutionDashboard>> GetDashboard([FromQuery] int limit = 20, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Architecture evolution dashboard requested from web admin endpoint. limit={Limit}", limit);
        return Ok(await service.GetDashboardAsync(limit, cancellationToken));
    }

    [HttpPost("recommendations/{recommendationId:guid}/review")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<IActionResult> ReviewRecommendation(Guid recommendationId, [FromBody] ArchitectDecisionRequest request, CancellationToken cancellationToken)
    {
        logger.LogInformation("Architecture evolution recommendation review requested from web admin endpoint. recommendationId={RecommendationId}", recommendationId);
        return await service.RecordArchitectDecisionAsync(recommendationId, request, cancellationToken) ? Ok() : NotFound();
    }
}
