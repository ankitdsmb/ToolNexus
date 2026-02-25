using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/governance/decisions")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class GovernanceDecisionsController(IGovernanceDecisionService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<GovernanceDecisionPage>> GetDecisions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? toolId = null,
        [FromQuery] string? policyVersion = null,
        [FromQuery] DateTime? startDateUtc = null,
        [FromQuery] DateTime? endDateUtc = null,
        CancellationToken cancellationToken = default)
    {
        var result = await service.GetDecisionsAsync(
            new GovernanceDecisionQuery(page, pageSize, toolId, policyVersion, startDateUtc, endDateUtc),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GovernanceDecisionRecord>> GetDecision([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var decision = await service.GetByIdAsync(id, cancellationToken);
        return decision is null ? NotFound() : Ok(decision);
    }
}
