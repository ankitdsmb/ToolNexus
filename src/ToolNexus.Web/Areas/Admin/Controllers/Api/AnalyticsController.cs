using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AnalyticsController(IAdminAnalyticsService service, ILogger<AnalyticsController> logger) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminAnalyticsDashboard>> GetDashboard(CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin analytics dashboard requested.");
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
        logger.LogInformation("Admin analytics tool detail requested. toolSlug={ToolSlug}", toolSlug);
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
        logger.LogInformation("Admin analytics drilldown requested. toolSlug={ToolSlug} page={Page} pageSize={PageSize}", toolSlug, page, pageSize);
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
