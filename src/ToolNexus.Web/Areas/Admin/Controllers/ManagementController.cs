using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ManagementController : Controller
{
    [HttpGet]
    public IActionResult Users() => View();

    [HttpGet]
    public IActionResult FeatureFlags() => View();

    [HttpGet]
    public IActionResult Settings() => View();

}
