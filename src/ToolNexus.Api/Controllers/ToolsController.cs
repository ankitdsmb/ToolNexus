using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/v1/tools")]
[Route("api/tools")]
public sealed class ToolsController(IToolService toolService) : ControllerBase
{
    [HttpGet("{slug}/{action}")]
    public async Task<ActionResult<ToolExecutionResponse>> ExecuteGet(
        [FromRoute, Required, MinLength(1)] string slug,
        [FromRoute, Required, MinLength(1)] string action,
        [FromQuery, Required] string input,
        CancellationToken cancellationToken)
    {
        var result = await toolService.ExecuteAsync(
            new ToolExecutionRequest(slug, action, input),
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(result);
        }

        return result.Success ? Ok(result) : BadRequest(result);
    }

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
