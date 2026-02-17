using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/v1/tools")]
[Route("api/tools")]
public sealed class ToolsController(
    IToolService toolService,
    IToolCatalogService catalogService,
    IToolManifestGovernance manifestGovernance,
    ILogger<ToolsController> logger) : ControllerBase
{
    [HttpGet("manifest")]
    public ActionResult<IReadOnlyCollection<ToolManifest>> Manifest([FromQuery] string? search = null)
    {
        var manifests = manifestGovernance.GetAll();
        if (!string.IsNullOrWhiteSpace(search))
        {
            manifests = manifests
                .Where(x => x.Slug.Contains(search, StringComparison.OrdinalIgnoreCase)
                    || x.Category.Contains(search, StringComparison.OrdinalIgnoreCase))
                .ToArray();
        }

        return Ok(manifests);
    }

    [HttpGet("categories")]
    public ActionResult<IReadOnlyCollection<string>> Categories() => Ok(catalogService.GetAllCategories());

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
            logger.LogInformation("Tool not found for slug {Slug} and action {Action}.", slug, action);
            return NotFound(result);
        }

        if (!result.Success)
        {
            logger.LogWarning("Tool execution failed for slug {Slug} and action {Action}. Error: {Error}", slug, action, result.Error);
        }

        if (manifestGovernance.FindBySlug(slug)?.IsDeprecated == true)
        {
            Response.Headers.Append("X-Tool-Deprecated", "true");
        }

        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{slug}")]
    public async Task<ActionResult<ToolExecutionResponse>> Execute(
        [FromRoute, Required, MinLength(1)] string slug,
        [FromBody] ExecuteToolRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid request.", detail: "Request body is required.");
        }

        var result = await toolService.ExecuteAsync(
            new ToolExecutionRequest(slug, request.Action, request.Input, request.Options),
            cancellationToken);

        if (result.NotFound)
        {
            logger.LogInformation("Tool not found for slug {Slug} and action {Action}.", slug, request.Action);
            return NotFound(result);
        }

        if (!result.Success)
        {
            logger.LogWarning("Tool execution failed for slug {Slug} and action {Action}. Error: {Error}", slug, request.Action, result.Error);
        }

        if (manifestGovernance.FindBySlug(slug)?.IsDeprecated == true)
        {
            Response.Headers.Append("X-Tool-Deprecated", "true");
        }

        return result.Success ? Ok(result) : BadRequest(result);
    }

    public sealed record ExecuteToolRequest(
        [property: Required(AllowEmptyStrings = false), MinLength(1)] string Action,
        [property: Required] string Input,
        IDictionary<string, string>? Options = null);
}
