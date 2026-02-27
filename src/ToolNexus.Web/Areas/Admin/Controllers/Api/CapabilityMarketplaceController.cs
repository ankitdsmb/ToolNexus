using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/capabilities/marketplace")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class CapabilityMarketplaceController(ICapabilityMarketplaceService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CapabilityMarketplaceDashboard>> Get(
        [FromQuery] int limit = 100,
        [FromQuery] string? toolId = null,
        [FromQuery] string? capabilityId = null,
        [FromQuery] CapabilityRegistryStatus? status = null,
        [FromQuery] DateTime? syncedAfterUtc = null,
        CancellationToken cancellationToken = default)
    {
        var dashboard = await service.GetDashboardAsync(
            new CapabilityMarketplaceQuery(limit, toolId, capabilityId, status, syncedAfterUtc),
            cancellationToken);

        return Ok(dashboard);
    }

    [HttpGet("{capabilityId}")]
    public async Task<ActionResult<CapabilityRegistryEntry>> GetByCapabilityId(
        string capabilityId,
        CancellationToken cancellationToken = default)
    {
        var entry = await service.GetByCapabilityIdAsync(capabilityId, cancellationToken);
        return entry is null ? NotFound() : Ok(entry);
    }
}
