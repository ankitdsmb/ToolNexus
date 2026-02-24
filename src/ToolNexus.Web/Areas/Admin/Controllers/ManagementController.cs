using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ManagementController(ILogger<ManagementController> logger) : Controller
{
    [HttpGet]
    public IActionResult Users()
    {
        logger.LogInformation("Admin management users page requested.");
        return View();
    }

    [HttpGet]
    public IActionResult FeatureFlags()
    {
        logger.LogInformation("Admin management feature flags page requested.");
        return View();
    }

    [HttpGet]
    public IActionResult Settings()
    {
        logger.LogInformation("Admin management settings page requested.");
        return View();
    }
}
