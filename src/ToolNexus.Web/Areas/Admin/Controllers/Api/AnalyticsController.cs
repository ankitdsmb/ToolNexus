using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Web.Security;
using ToolNexus.Application.Services;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

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


    [HttpGet("tool-detail")]
    public async Task<ActionResult<AdminAnalyticsToolDetail>> GetToolDetail(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] string? toolSlug,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var query = new AdminAnalyticsQuery(
            startDate ?? today.AddDays(-13),
            endDate ?? today,
            toolSlug,
            1,
            100);

        var detail = await service.GetToolDetailAsync(query, cancellationToken);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpGet("drilldown")]
    public async Task<ActionResult<AdminAnalyticsDrilldownResult>> GetDrilldown(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] string? toolSlug,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var query = new AdminAnalyticsQuery(
            startDate ?? today.AddDays(-13),
            endDate ?? today,
            toolSlug,
            page,
            pageSize);

        return Ok(await service.GetDrilldownAsync(query, cancellationToken));
    }
}
