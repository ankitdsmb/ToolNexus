using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("admin/ai-capability-factory")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AiCapabilityFactoryController(IAiCapabilityFactoryService service) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<AiCapabilityFactoryDashboard>> Dashboard([FromQuery] int take = 50, CancellationToken cancellationToken = default)
        => Ok(await service.GetDashboardAsync(take, cancellationToken));
}
