using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/analytics")]
public sealed class AnalyticsController(IAdminAnalyticsService service) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminAnalyticsDashboard>> GetDashboard(CancellationToken cancellationToken)
    {
        var dashboard = await service.GetDashboardAsync(cancellationToken);
        return Ok(dashboard);
    }
}
