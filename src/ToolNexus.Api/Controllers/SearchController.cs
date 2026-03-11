using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Contracts;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers;

[ApiController]
[Route("v1/search")]
public sealed class SearchController(DiscoveryService discoveryService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<ToolSearchResultDto>> Search(
        [FromQuery(Name = "q")] string? query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await discoveryService.SearchAsync(query, page, pageSize, cancellationToken);
        return Ok(result);
    }
}
