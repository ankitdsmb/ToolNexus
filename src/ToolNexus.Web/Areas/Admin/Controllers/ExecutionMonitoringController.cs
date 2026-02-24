using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/execution-monitoring")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ExecutionMonitoringController(ILogger<ExecutionMonitoringController> logger) : Controller
{
    [HttpGet("")]
    public IActionResult Index()
    {
        logger.LogInformation("Admin execution monitoring page requested.");
        return View();
    }
}
