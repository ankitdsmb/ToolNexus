using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ChangeHistoryController(IAdminAuditLogService service, ILogger<ChangeHistoryController> logger) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? actionType = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? actor = null,
        [FromQuery] string? severity = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        [FromQuery] string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Admin change history page requested. page={Page} pageSize={PageSize}", page, pageSize);
        var query = new ChangeHistoryQuery(page, pageSize, search, actionType, entityType, actor, severity, fromUtc, toUtc, correlationId);
        var entries = await service.QueryAsync(query, cancellationToken);
        return View(entries);
    }

    [HttpGet("payload/{id:guid}")]
    public async Task<IActionResult> Payload([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin change history payload requested. id={AuditEventId}", id);
        var payload = await service.GetPayloadDetailAsync(id, cancellationToken);
        if (payload is null)
        {
            return NotFound();
        }

        return Ok(payload);
    }

    [HttpGet("query")]
    public async Task<ActionResult<ChangeHistoryPage>> Query(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] string? actionType = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? actor = null,
        [FromQuery] string? severity = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        [FromQuery] string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Admin change history query API requested. page={Page} pageSize={PageSize}", page, pageSize);
        var query = new ChangeHistoryQuery(page, pageSize, search, actionType, entityType, actor, severity, fromUtc, toUtc, correlationId);
        return Ok(await service.QueryAsync(query, cancellationToken));
    }
}
