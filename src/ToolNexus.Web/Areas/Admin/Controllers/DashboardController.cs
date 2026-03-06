using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Areas.Admin.Models;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class DashboardController(ILogger<DashboardController> logger, ToolNexusContentDbContext contentDbContext) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        logger.LogInformation("Admin dashboard page requested.");

        var model = new AdminDashboardViewModel
        {
            TotalFeedback = await contentDbContext.Feedback.CountAsync(cancellationToken),
            OpenFeedback = await contentDbContext.Feedback
                .CountAsync(x => x.Status == FeedbackStatus.New || x.Status == FeedbackStatus.UnderReview || x.Status == FeedbackStatus.Planned, cancellationToken),
            RoadmapItems = await contentDbContext.RoadmapItems.CountAsync(cancellationToken),
            RecentChangelog = await contentDbContext.ChangelogEntries
                .AsNoTracking()
                .OrderByDescending(x => x.ReleaseDate)
                .ThenByDescending(x => x.CreatedAt)
                .Take(5)
                .Select(x => new AdminRecentChangelogItemViewModel(x.Version, x.Title, x.ReleaseDate))
                .ToListAsync(cancellationToken)
        };

        return View(model);
    }
}
