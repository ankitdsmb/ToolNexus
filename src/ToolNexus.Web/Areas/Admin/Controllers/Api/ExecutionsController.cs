using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/executions")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ExecutionsController(IExecutionLedgerService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ExecutionLedgerPage>> GetExecutions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? correlationId = null,
        [FromQuery] string? tenantId = null,
        [FromQuery] string? toolId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await service.GetExecutionsAsync(new ExecutionLedgerQuery(page, pageSize, correlationId, tenantId, toolId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExecutionLedgerDetail>> GetExecution([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var item = await service.GetExecutionByIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("{id:guid}/snapshot")]
    public async Task<ActionResult<ExecutionLedgerSnapshot>> GetSnapshot([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var item = await service.GetSnapshotByExecutionIdAsync(id, cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }
}
