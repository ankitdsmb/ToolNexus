using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/v1/tools")]
public sealed class ToolsController(IToolService toolService) : ControllerBase
{
    [HttpPost("{slug}")]
    public async Task<ActionResult<ToolExecutionResponse>> Execute(
        [FromRoute, Required, MinLength(1)] string slug,
        [FromBody] ExecuteToolRequest request,
        CancellationToken cancellationToken)
    {
        var result = await toolService.ExecuteAsync(
            new ToolExecutionRequest(slug, request.Action, request.Input, request.Options),
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(result);
        }

        return result.Success ? Ok(result) : BadRequest(result);
    }

    public sealed record ExecuteToolRequest(
        [property: Required(AllowEmptyStrings = false), MinLength(1)] string Action,
        [property: Required] string Input,
        IDictionary<string, string>? Options = null);
}
