using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Api.Logging;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/runtime/incidents")]
public sealed class RuntimeIncidentsController(IRuntimeIncidentService service, IRuntimeClientLoggerService? runtimeClientLoggerService = null) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Post([FromBody] RuntimeIncidentIngestBatch request, CancellationToken cancellationToken)
    {
        var correlationId = ResolveCorrelationId();
        var normalized = request with
        {
            Incidents = request.Incidents.Select(incident => incident with
            {
                CorrelationId = string.IsNullOrWhiteSpace(incident.CorrelationId) ? correlationId : incident.CorrelationId
            }).ToArray()
        };

        try
        {
            await service.IngestAsync(normalized, cancellationToken);
        }
        catch
        {
            // runtime incident ingestion is best-effort and must not fail caller requests
        }

        return Ok(new { success = true });
    }


    [HttpPost("logs")]
    [AllowAnonymous]
    public async Task<IActionResult> PostClientLogs([FromBody] ClientIncidentLogBatch request, CancellationToken cancellationToken)
    {
        if (runtimeClientLoggerService is null)
        {
            return Accepted();
        }

        try
        {
            await runtimeClientLoggerService.WriteBatchAsync(request, cancellationToken);
        }
        catch
        {
            // best effort logging endpoint must not fail callers
        }
        return Accepted();
    }

    [HttpPost("/api/admin/runtime/logs")]
    [AllowAnonymous]
    public Task<IActionResult> PostRuntimeLog([FromBody] ClientIncidentLogRequest request, CancellationToken cancellationToken)
        => PostClientLogs(new ClientIncidentLogBatch([request]), cancellationToken);

    [HttpGet]
    [Authorize(Policy = AdminPolicyNames.AdminRead)]
    public async Task<ActionResult<IReadOnlyList<RuntimeIncidentSummary>>> Get([FromQuery] int take = 100, CancellationToken cancellationToken = default)
        => Ok(await service.GetLatestSummariesAsync(take, cancellationToken));

    [HttpGet("/api/admin/runtime/tool-health")]
    [Authorize(Policy = AdminPolicyNames.AdminRead)]
    public async Task<ActionResult<IReadOnlyList<RuntimeToolHealthSnapshot>>> GetToolHealth(CancellationToken cancellationToken = default)
        => Ok(await service.GetToolHealthAsync(cancellationToken));

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
