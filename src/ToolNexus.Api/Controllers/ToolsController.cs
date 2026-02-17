using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/v1/tools")]
[Route("api/tools")]
public sealed class ToolsController(IToolService toolService, IToolManifestCatalog manifestCatalog) : ControllerBase
{
    [HttpGet("manifest")]
    public ActionResult<IReadOnlyCollection<ToolManifestV1>> GetManifest() => Ok(manifestCatalog.GetAll());

    [HttpGet("{slug}/{action}")]
    public async Task<ActionResult<ToolExecutionResponse>> ExecuteGet(
        [FromRoute, Required, MinLength(1)] string slug,
        [FromRoute, Required, MinLength(1)] string action,
        [FromQuery, Required] string input,
        CancellationToken cancellationToken)
    {
        var result = await toolService.ExecuteAsync(new ToolExecutionRequest(slug, action, input), cancellationToken);
        return ToHttpResponse(result);
    }

    [HttpPost("{slug}")]
    public async Task<ActionResult<ToolExecutionResponse>> Execute(
        [FromRoute, Required, MinLength(1)] string slug,
        [FromBody] ExecuteToolRequest request,
        CancellationToken cancellationToken)
    {
        var result = await toolService.ExecuteAsync(
            new ToolExecutionRequest(slug, request?.Action ?? string.Empty, request?.Input ?? string.Empty, request?.Options),
            cancellationToken);

        return ToHttpResponse(result);
    }

    private ActionResult<ToolExecutionResponse> ToHttpResponse(ToolExecutionResponse response)
    {
        if (response.Success)
        {
            return Ok(response);
        }

        return response.Error?.Code switch
        {
            "tool_not_found" => NotFound(response),
            "unexpected_error" => StatusCode(StatusCodes.Status500InternalServerError, response),
            _ => BadRequest(response)
        };
    }

    public sealed record ExecuteToolRequest(
        [property: Required(AllowEmptyStrings = false), MinLength(1)] string Action,
        [property: Required] string Input,
        IDictionary<string, string>? Options = null);
}
