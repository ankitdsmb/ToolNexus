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
[Route("api/admin/content")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ContentController(IToolContentEditorService service , IConcurrencyObservability concurrencyObservability, ILogger<ContentController> logger) : ControllerBase
{
    [HttpGet("{toolId:int}")]
    public async Task<ActionResult<ToolContentEditorGraph>> Get([FromRoute] int toolId, CancellationToken cancellationToken)
    {
        var graph = await service.GetGraphByToolIdAsync(toolId, cancellationToken);
        return graph is null ? NotFound() : Ok(graph);
    }

    [HttpPut("{toolId:int}")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<IActionResult> Save([FromRoute] int toolId, [FromBody] SaveToolContentGraphRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var changed = await service.SaveGraphAsync(toolId, request, cancellationToken);
            return changed ? NoContent() : NotFound();
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
}
