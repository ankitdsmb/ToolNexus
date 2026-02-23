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
[Route("api/admin/tools")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ToolsController(IToolDefinitionService service , IConcurrencyObservability concurrencyObservability, ILogger<ToolsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ToolDefinitionListItem>>> List(CancellationToken cancellationToken)
        => Ok(await service.GetListAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ToolDefinitionDetail>> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        var tool = await service.GetByIdAsync(id, cancellationToken);
        return tool is null ? NotFound() : Ok(tool);
    }

    [HttpPost]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<ToolDefinitionDetail>> Create([FromBody] SaveToolRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await service.CreateAsync(request.ToCreateRequest(), cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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

    [HttpPut("{id:int}")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<ToolDefinitionDetail>> Update([FromRoute] int id, [FromBody] SaveToolRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await service.UpdateAsync(id, request.ToUpdateRequest(), cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
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

    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<IActionResult> SetStatus([FromRoute] int id, [FromBody] SetToolStatusRequest request, CancellationToken cancellationToken)
    {
        var changed = await service.SetEnabledAsync(id, request.Enabled, cancellationToken);
        return changed ? NoContent() : NotFound();
    }

    public sealed record SaveToolRequest(
        [Required] string Name,
        [Required] string Slug,
        [Required] string Description,
        [Required] string Category,
        [Required] string Status,
        [Required] string Icon,
        int SortOrder,
        [Required] string InputSchema,
        [Required] string OutputSchema,
        string? VersionToken = null)
    {
        public CreateToolDefinitionRequest ToCreateRequest() => new(Name, Slug, Description, Category, Status, Icon, SortOrder, InputSchema, OutputSchema);
        public UpdateToolDefinitionRequest ToUpdateRequest() => new(Name, Slug, Description, Category, Status, Icon, SortOrder, InputSchema, OutputSchema, VersionToken);
    }

    public sealed record SetToolStatusRequest(bool Enabled);
}
