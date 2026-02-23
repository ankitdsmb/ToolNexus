using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("admin/execution")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ExecutionMonitoringController(IAdminExecutionMonitoringService service) : ControllerBase
{
    [HttpGet("health")]
    public async Task<ActionResult<ExecutionHealthSummary>> GetHealth(CancellationToken cancellationToken)
        => Ok(await service.GetHealthAsync(cancellationToken));

    [HttpGet("workers")]
    public async Task<ActionResult<ExecutionWorkersResponse>> GetWorkers(CancellationToken cancellationToken)
        => Ok(await service.GetWorkersAsync(cancellationToken));

    [HttpGet("incidents")]
    public async Task<ActionResult<ExecutionIncidentPage>> GetIncidents([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
        => Ok(await service.GetIncidentsAsync(page, pageSize, cancellationToken));
}
