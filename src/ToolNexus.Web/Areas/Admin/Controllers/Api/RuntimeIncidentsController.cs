using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/runtime/incidents")]
public sealed class RuntimeIncidentsController(IRuntimeIncidentService service) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public IActionResult Post([FromBody] RuntimeIncidentIngestBatch request, CancellationToken cancellationToken)
    {
        var correlationId = ResolveCorrelationId();
        var normalized = request with
        {
            Incidents = request.Incidents.Select(incident => incident with
            {
                CorrelationId = string.IsNullOrWhiteSpace(incident.CorrelationId) ? correlationId : incident.CorrelationId
            }).ToArray()
        };

        _ = Task.Run(async () =>
        {
            try
            {
                await service.IngestAsync(normalized, CancellationToken.None);
            }
            catch
            {
                // runtime incident ingestion is best-effort and must not fail caller requests
            }
        });

        return Ok(new { success = true });
    }

    [HttpGet]
    [Authorize(Policy = AdminPolicyNames.AdminRead)]
    public async Task<ActionResult<IReadOnlyList<RuntimeIncidentSummary>>> Get([FromQuery] int take = 100, CancellationToken cancellationToken = default)
        => Ok(await service.GetLatestSummariesAsync(take, cancellationToken));

    [HttpPost("logs")]
    [AllowAnonymous]
    public IActionResult PostClientLogs([FromBody] ClientIncidentLogBatch request)
        => Accepted();

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
