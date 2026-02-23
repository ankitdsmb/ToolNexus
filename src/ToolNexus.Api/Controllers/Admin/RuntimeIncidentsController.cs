using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/runtime/incidents")]
public sealed class RuntimeIncidentsController(IRuntimeIncidentService service) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Post([FromBody] RuntimeIncidentIngestBatch request, CancellationToken cancellationToken)
    {
        await service.IngestAsync(request, cancellationToken);
        return Accepted();
    }

    [HttpGet]
    [Authorize(Policy = AdminPolicyNames.AdminRead)]
    public async Task<ActionResult<IReadOnlyList<RuntimeIncidentSummary>>> Get([FromQuery] int take = 100, CancellationToken cancellationToken = default)
        => Ok(await service.GetLatestSummariesAsync(take, cancellationToken));
}
