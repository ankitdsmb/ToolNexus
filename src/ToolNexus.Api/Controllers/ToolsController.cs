using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("api/v1/tools")]
public sealed class ToolsController(
    IToolService toolService,
    IToolCatalogService catalogService,
    IToolManifestGovernance manifestGovernance,
    ILogger<ToolsController> logger) : ControllerBase
{
    [HttpGet("ping")]
    [AllowAnonymous]
    public IActionResult Ping() => Ok(new { status = "ok" });

    [HttpGet("manifest")]
    [AllowAnonymous]
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
    [AllowAnonymous]
    public ActionResult<IReadOnlyCollection<string>> Categories() => Ok(catalogService.GetAllCategories());

    [Authorize(Policy = ToolActionRequirement.PolicyName)]
    [HttpGet("{slug}/{toolAction}")]
    public Task<ActionResult<ToolExecutionResponse>> ExecuteGet(
        [FromRoute, Required, MinLength(1)] string slug,
        [FromRoute(Name = "toolAction"), Required, MinLength(1)] string action,
        [FromQuery, Required] string input,
        CancellationToken cancellationToken)
        => ExecuteInternalAsync(slug, action, input, null, cancellationToken);

    [Authorize(Policy = ToolActionRequirement.PolicyName)]
    [Consumes("application/json")]
    [HttpPost("{slug}/{toolAction}")]
    public Task<ActionResult<ToolExecutionResponse>> Execute(
        [FromRoute, Required, MinLength(1)] string slug,
        [FromRoute(Name = "toolAction"), Required, MinLength(1)] string action,
        [FromBody] ExecuteToolRequest request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return Task.FromResult<ActionResult<ToolExecutionResponse>>(BadRequest("Request body is required."));
        }

        return ExecuteInternalAsync(slug, action, request.Input, request.Options, cancellationToken);
    }

    private async Task<ActionResult<ToolExecutionResponse>> ExecuteInternalAsync(
        string slug,
        string action,
        string input,
        IDictionary<string, string>? options,
        CancellationToken cancellationToken)
    {
        var result = await toolService.ExecuteAsync(
            new ToolExecutionRequest(slug, action, input, options),
            cancellationToken);

        if (result.NotFound)
        {
            logger.LogInformation("Tool not found for slug {Slug} and action {Action}.", slug, action);
            return NotFound(result);
        }

        if (!result.Success)
        {
            logger.LogWarning("Tool execution failed for slug {Slug} and action {Action}. Error: {Error}", slug, action, result.Error);
            return BadRequest(result);
        }

        if (manifestGovernance.FindBySlug(slug)?.IsDeprecated == true)
        {
            Response.Headers.Append("X-Tool-Deprecated", "true");
        }

        return Ok(result);
    }

    public sealed record ExecuteToolRequest(
        string Input,
        IDictionary<string, string>? Options = null);
}
