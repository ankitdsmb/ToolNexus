using System.ComponentModel.DataAnnotations;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/execution")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ExecutionController(IExecutionPolicyService service , IConcurrencyObservability concurrencyObservability, ILogger<ExecutionController> logger) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<ActionResult<ToolExecutionPolicyModel>> Get([FromRoute] string slug, CancellationToken cancellationToken)
    {
        var policy = await service.GetBySlugAsync(slug, cancellationToken);
        return Ok(policy);
    }

    [HttpPut("{slug}")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<ToolExecutionPolicyModel>> Update([FromRoute] string slug, [FromBody] UpdateExecutionPolicyRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await service.UpdateBySlugAsync(slug, request.ToModel(), cancellationToken);
            return Ok(updated);
        }
        catch (ValidationException ex)
        {
            return ValidationProblem(detail: ex.Message);
        }
        catch (ConcurrencyConflictException ex)
        {
            concurrencyObservability.RecordResolutionAction(ex.Conflict.Resource, "conflict_presented");
            logger.LogWarning("API concurrency conflict handled. resourceType={ResourceType} actorId={ActorId} clientToken={ClientToken} serverToken={ServerToken} outcome={Outcome}", ex.Conflict.Resource, User?.Identity?.Name ?? "unknown", ex.Conflict.ClientVersionToken, ex.Conflict.ServerVersionToken, "return_conflict");
            return StatusCode((int)HttpStatusCode.Conflict, ConcurrencyConflict.ToEnvelope(ex.Conflict));
        }
    }

    public sealed record UpdateExecutionPolicyRequest(
        [Required] string ExecutionMode,
        int TimeoutSeconds,
        int MaxRequestsPerMinute,
        int MaxInputSize,
        bool IsExecutionEnabled,
        string? VersionToken = null)
    {
        public UpdateToolExecutionPolicyRequest ToModel()
            => new(ExecutionMode, TimeoutSeconds, MaxRequestsPerMinute, MaxInputSize, IsExecutionEnabled, VersionToken);
    }
}
