using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/feedback")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class FeedbackController(ToolNexusContentDbContext contentDbContext) : Controller
{
    [HttpGet("")]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var feedback = await contentDbContext.Feedback
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(250)
            .ToListAsync(cancellationToken);

        return View(feedback);
    }

    [HttpPost("{id:guid}/status")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateStatus([FromRoute] Guid id, [FromForm] string status, CancellationToken cancellationToken)
    {
        var item = await contentDbContext.Feedback.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item is null)
        {
            return RedirectToAction(nameof(Index));
        }

        var allowedStatuses = new[] { FeedbackStatus.New, FeedbackStatus.UnderReview, FeedbackStatus.Planned, FeedbackStatus.Completed };
        if (allowedStatuses.Contains(status, StringComparer.Ordinal))
        {
            item.Status = status;
            await contentDbContext.SaveChangesAsync(cancellationToken);
        }

        return RedirectToAction(nameof(Index));
    }
}
