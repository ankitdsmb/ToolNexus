using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Infrastructure;
using ToolNexus.Tools.Common;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/v1/tools")]
public sealed class ToolsController(IToolExecutorFactory factory) : ControllerBase
{
    [HttpPost("{slug}")]
    public async Task<ActionResult<ToolResult>> Execute(
        [FromRoute] string slug,
        [FromBody] ToolRequest request,
        CancellationToken cancellationToken)
    {
        var executor = factory.Resolve(slug);
        if (executor is null)
        {
            return NotFound(ToolResult.Fail($"Tool '{slug}' not found."));
        }

        var result = await executor.ExecuteAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
