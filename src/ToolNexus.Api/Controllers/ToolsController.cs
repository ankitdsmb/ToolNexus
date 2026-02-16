using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Application;
using ToolNexus.Tools.Common;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/tools")]
public sealed class ToolsController(IToolExecutionService toolExecutionService) : ControllerBase
{
    [HttpPost("{slug}/{action}")]
    public async Task<ActionResult<ToolResult>> Execute(
        [FromRoute] string slug,
        [FromRoute] string action,
        [FromBody] ToolRequest request,
        CancellationToken cancellationToken)
    {
        var outcome = await toolExecutionService.ExecuteAsync(slug, action, request, cancellationToken);
        if (!outcome.ToolFound)
        {
            return NotFound(outcome.Result);
        }

        var result = outcome.Result;
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
