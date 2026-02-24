using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Api.Authentication;

namespace ToolNexus.Api.Controllers.Admin;

[ApiController]
[Route("admin/analytics")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AnalyticsController(IAdminAnalyticsService service, ILogger<AnalyticsController> logger) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminAnalyticsDashboard>> GetDashboard(CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin API analytics dashboard requested.");
        return Ok(await service.GetDashboardAsync(cancellationToken));
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
        logger.LogInformation("Admin API analytics drilldown requested. toolSlug={ToolSlug} page={Page} pageSize={PageSize}", toolSlug, page, pageSize);
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
