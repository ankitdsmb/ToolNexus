using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/analytics")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AnalyticsController(ILogger<AnalyticsController> logger) : Controller
{
    [HttpGet("")]
    public IActionResult Index()
    {
        logger.LogInformation("Admin analytics page requested.");
        return View();
    }
}
