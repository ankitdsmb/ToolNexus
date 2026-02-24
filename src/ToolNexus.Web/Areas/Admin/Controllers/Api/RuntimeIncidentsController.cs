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
    public async Task<ActionResult<IReadOnlyList<RuntimeIncidentSummary>>> Get([FromQuery] int? take, CancellationToken cancellationToken = default)
    {
        if (!ModelState.IsValid)
        {
            LogModelBindingFailure();
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        var normalizedTake = take.GetValueOrDefault(100);
        if (normalizedTake <= 0)
        {
            normalizedTake = 100;
        }

        logger.LogInformation("[RuntimeIncidentAPI] Request received for runtime incidents. take={RequestedTake}", take);
        logger.LogInformation("[RuntimeIncidentAPI] Parsed filters. take={Take}", normalizedTake);
        var incidents = await service.GetLatestSummariesAsync(normalizedTake, cancellationToken);
        logger.LogInformation("[RuntimeIncidentAPI] Returning {IncidentCount} incidents.", incidents.Count);
        return Ok(incidents);
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
        if (!ModelState.IsValid)
        {
            LogModelBindingFailure();
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        var invalidLevel = request.Logs.FirstOrDefault(log => !IsValidLogLevel(log.Level));
        if (invalidLevel is not null)
        {
            ModelState.AddModelError(nameof(ClientIncidentLogRequest.Level), $"Unsupported log level '{invalidLevel.Level}'.");
            LogModelBindingFailure();
            return BadRequest(new ValidationProblemDetails(ModelState));
        }

        logger.LogInformation("Runtime client logs accepted from web admin endpoint. count={LogCount}", request.Logs.Count);
        return Accepted();
    }

    private static bool IsValidLogLevel(string? level)
        => level is "debug" or "info" or "warn" or "error";

    private void LogModelBindingFailure()
    {
        foreach (var entry in ModelState)
        {
            var attemptedValue = entry.Value?.AttemptedValue;
            foreach (var error in entry.Value?.Errors ?? [])
            {
                logger.LogWarning("[RuntimeIncidentAPI] Model binding failed: field={Field} value={AttemptedValue} error={Error}", entry.Key, attemptedValue, error.ErrorMessage);
            }
        }
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
