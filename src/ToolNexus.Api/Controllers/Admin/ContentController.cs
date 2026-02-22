using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/content")]
public sealed class ContentController(IToolContentEditorService service) : ControllerBase
{
    [HttpGet("{toolId:int}")]
    public async Task<ActionResult<ToolContentEditorGraph>> Get([FromRoute] int toolId, CancellationToken cancellationToken)
    {
        var graph = await service.GetGraphByToolIdAsync(toolId, cancellationToken);
        return graph is null ? NotFound() : Ok(graph);
    }

    [HttpPut("{toolId:int}")]
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
    }
}
