using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/tools")]
public sealed class ToolsController(IToolService toolService) : ControllerBase
{
    [HttpPost("{slug}/{action}")]
    public async Task<ActionResult<ToolExecutionResponse>> Execute(
        [FromRoute] string slug,
        [FromRoute] string action,
        [FromBody] ExecuteToolRequest request,
        CancellationToken cancellationToken)
    {
        var result = await toolService.ExecuteAsync(
            new ToolExecutionRequest(slug, action, request.Input, request.Options),
            cancellationToken);

        if (result.NotFound)
        {
            return NotFound(result);
        }

        return result.Success ? Ok(result) : BadRequest(result);
    }

    public sealed record ExecuteToolRequest(string Input, IDictionary<string, string>? Options = null);
}
