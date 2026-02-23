using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Services;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
public sealed class ChangeHistoryController(IAdminAuditLogService service) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var entries = await service.GetRecentAsync(200, cancellationToken);
        return View(entries);
    }
}
