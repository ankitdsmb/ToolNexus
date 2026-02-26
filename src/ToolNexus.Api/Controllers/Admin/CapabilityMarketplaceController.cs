using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/capabilities/marketplace")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class CapabilityMarketplaceController(ICapabilityMarketplaceService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CapabilityMarketplaceDashboard>> Get(
        [FromQuery] int limit = 100,
        [FromQuery] string? toolId = null,
        [FromQuery] CapabilityRegistryStatus? status = null,
        [FromQuery] DateTime? syncedAfterUtc = null,
        CancellationToken cancellationToken = default)
    {
        var dashboard = await service.GetDashboardAsync(
            new CapabilityMarketplaceQuery(limit, toolId, status, syncedAfterUtc),
            cancellationToken);

        return Ok(dashboard);
    }
}
