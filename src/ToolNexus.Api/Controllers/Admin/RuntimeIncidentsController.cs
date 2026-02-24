using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Api.Logging;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/runtime/incidents")]
public sealed class RuntimeIncidentsController(IRuntimeIncidentService service, ILogger<RuntimeIncidentsController> logger, IRuntimeClientLoggerService? runtimeClientLoggerService = null) : ControllerBase
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
            logger.LogInformation("Admin API runtime incidents ingested. count={IncidentCount}", normalized.Incidents.Count);
        }
        catch
        {
            logger.LogWarning("Admin API runtime incident ingestion failed and was suppressed.");
            // runtime incident ingestion is best-effort and must not fail caller requests
        }

        return Ok(new { success = true });
    }

    [HttpPost("logs")]
    [AllowAnonymous]
    public async Task<IActionResult> PostClientLogs([FromBody] ClientIncidentLogBatch request, CancellationToken cancellationToken)
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

        if (runtimeClientLoggerService is null)
        {
            logger.LogInformation("Admin API runtime client logs accepted without sink. count={LogCount}", request.Logs.Count);
            return Accepted();
        }

        try
        {
            await runtimeClientLoggerService.WriteBatchAsync(request, cancellationToken);
            logger.LogInformation("Admin API runtime client logs written. count={LogCount}", request.Logs.Count);
        }
        catch
        {
            logger.LogWarning("Admin API runtime client log write failed and was suppressed.");
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
        logger.LogInformation("Admin API runtime tool health requested.");
        return Ok(await service.GetToolHealthAsync(cancellationToken));
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
}
