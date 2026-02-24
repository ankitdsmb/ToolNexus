using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/runtime/incidents")]
public sealed class RuntimeIncidentsController(IRuntimeIncidentService service, ILogger<RuntimeIncidentsController> logger) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Post([FromBody] RuntimeIncidentIngestBatch request, CancellationToken cancellationToken)
    {
        if (request?.Incidents is null || request.Incidents.Count == 0)
        {
            return BadRequest(new { error = "incidents payload is required" });
        }

        var correlationId = ResolveCorrelationId();
        var normalizedIncidents = request.Incidents
            .Where(static incident => !string.IsNullOrWhiteSpace(incident.ToolSlug) && !string.IsNullOrWhiteSpace(incident.Message))
            .Select(incident => incident with
            {
                CorrelationId = string.IsNullOrWhiteSpace(incident.CorrelationId) ? correlationId : incident.CorrelationId
            })
            .ToArray();

        if (normalizedIncidents.Length == 0)
        {
            return BadRequest(new { error = "at least one valid incident is required" });
        }

        logger.LogInformation("Runtime incidents ingested from web admin endpoint. count={IncidentCount}", normalizedIncidents.Length);
        await service.IngestAsync(new RuntimeIncidentIngestBatch(normalizedIncidents), cancellationToken);
        return Ok(new { success = true });
    }

    [HttpGet]
    [Authorize(Policy = AdminPolicyNames.AdminRead)]
    public async Task<ActionResult<IReadOnlyList<RuntimeIncidentSummary>>> Get([FromQuery] int take = 100, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Runtime incident summaries requested from web admin endpoint. take={Take}", take);
        return Ok(await service.GetLatestSummariesAsync(take, cancellationToken));
    }

    [HttpGet("/api/admin/runtime/tool-health")]
    [Authorize(Policy = AdminPolicyNames.AdminRead)]
    public async Task<ActionResult<IReadOnlyList<RuntimeToolHealthSnapshot>>> GetToolHealth(CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Runtime tool health requested from web admin endpoint.");
        return Ok(await service.GetToolHealthAsync(cancellationToken));
    }

    [HttpPost("logs")]
    [AllowAnonymous]
    public IActionResult PostClientLogs([FromBody] ClientIncidentLogBatch request)
    {
        logger.LogInformation("Runtime client logs accepted from web admin endpoint. count={LogCount}", request.Logs.Count);
        return Accepted();
    }

    private string? ResolveCorrelationId()
    {
        var context = HttpContext;
        if (context is null)
        {
            return null;
        }

        var headerValue = context.Request.Headers["X-Correlation-ID"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(headerValue))
        {
            return headerValue;
        }

        return context.TraceIdentifier;
    }
}
