using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class DashboardController(ILogger<DashboardController> logger) : Controller
{
    [HttpGet]
    public IActionResult Index()
    {
        logger.LogInformation("Admin dashboard page requested.");
        return View();
    }
}
