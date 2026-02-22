using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/tools")]
public sealed class ToolsController(IToolDefinitionService service) : ControllerBase
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
    }

    [HttpPut("{id:int}")]
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
    }

    [HttpPatch("{id:int}/status")]
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
        [Required] string OutputSchema)
    {
        public CreateToolDefinitionRequest ToCreateRequest() => new(Name, Slug, Description, Category, Status, Icon, SortOrder, InputSchema, OutputSchema);
        public UpdateToolDefinitionRequest ToUpdateRequest() => new(Name, Slug, Description, Category, Status, Icon, SortOrder, InputSchema, OutputSchema);
    }

    public sealed record SetToolStatusRequest(bool Enabled);
}
