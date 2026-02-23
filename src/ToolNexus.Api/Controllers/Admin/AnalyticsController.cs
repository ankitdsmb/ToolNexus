using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AnalyticsController(IAdminAnalyticsService service) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminAnalyticsDashboard>> GetDashboard(CancellationToken cancellationToken)
    {
        var dashboard = await service.GetDashboardAsync(cancellationToken);
        return Ok(dashboard);
    }
}
