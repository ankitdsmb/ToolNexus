using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/architecture/evolution")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ArchitectureEvolutionController(IArchitectureEvolutionService service) : ControllerBase
{
    [HttpPost("signals")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<ArchitectureEvolutionSignal>> IngestSignal([FromBody] EvolutionSignalIngestRequest request, CancellationToken cancellationToken)
        => Ok(await service.IngestSignalAsync(request, cancellationToken));

    [HttpPost("drift/detect")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<object>> DetectDrift(CancellationToken cancellationToken)
        => Ok(new { count = await service.RunDriftDetectionAsync(cancellationToken) });

    [HttpPost("recommendations/generate")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<object>> GenerateRecommendations(CancellationToken cancellationToken)
        => Ok(new { count = await service.GenerateRecommendationsAsync(cancellationToken) });

    [HttpGet("dashboard")]
    public async Task<ActionResult<EvolutionDashboard>> GetDashboard([FromQuery] int limit = 20, CancellationToken cancellationToken = default)
        => Ok(await service.GetDashboardAsync(limit, cancellationToken));

    [HttpPost("recommendations/{recommendationId:guid}/review")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<IActionResult> ReviewRecommendation(Guid recommendationId, [FromBody] ArchitectDecisionRequest request, CancellationToken cancellationToken)
        => await service.RecordArchitectDecisionAsync(recommendationId, request, cancellationToken) ? Ok() : NotFound();
}
