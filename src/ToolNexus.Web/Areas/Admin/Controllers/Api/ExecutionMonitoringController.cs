using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("admin/execution")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ExecutionMonitoringController(IAdminExecutionMonitoringService service, ILogger<ExecutionMonitoringController> logger) : ControllerBase
{
    [HttpGet("health")]
    public async Task<ActionResult<ExecutionHealthSummary>> GetHealth(CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin execution health requested.");
        return Ok(await service.GetHealthAsync(cancellationToken));
    }

    [HttpGet("workers")]
    public async Task<ActionResult<ExecutionWorkersResponse>> GetWorkers(CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin execution workers requested.");
        return Ok(await service.GetWorkersAsync(cancellationToken));
    }

    [HttpGet("incidents")]
    public async Task<ActionResult<ExecutionIncidentPage>> GetIncidents([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Admin execution incidents requested. page={Page} pageSize={PageSize}", page, pageSize);
        return Ok(await service.GetIncidentsAsync(page, pageSize, cancellationToken));
    }
}
