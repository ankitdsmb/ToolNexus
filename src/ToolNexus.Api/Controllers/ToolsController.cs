using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Infrastructure;
using ToolNexus.Tools.Common;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/tools")]
public sealed class ToolsController(IToolExecutorFactory factory) : ControllerBase
{
    [HttpPost("{slug}/{action}")]
    public async Task<ActionResult<ToolResult>> Execute(
        [FromRoute] string slug,
        [FromRoute] string action,
        [FromBody] ToolRequest request,
        CancellationToken cancellationToken)
    {
        var executor = factory.Resolve(slug);
        if (executor is null)
        {
            return NotFound(ToolResult.Fail($"Tool '{slug}' not found."));
        }

        var options = request.Options is null
            ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string>(request.Options, StringComparer.OrdinalIgnoreCase);

        options["action"] = action;
        var enrichedRequest = request with { Options = options };

        var result = await executor.ExecuteAsync(enrichedRequest, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
