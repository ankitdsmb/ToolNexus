using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ManagementController : Controller
{
    [HttpGet]
    public IActionResult Tools() => View("Section", "Tools");

    [HttpGet]
    public IActionResult Content() => View("Section", "Content");

    [HttpGet]
    public IActionResult Categories() => View("Section", "Categories");

    [HttpGet]
    public IActionResult Execution() => View("Section", "Execution");

    [HttpGet]
    public IActionResult Analytics() => View("Section", "Analytics");

    [HttpGet]
    public IActionResult Users() => View("Section", "Users");

    [HttpGet]
    public IActionResult FeatureFlags() => View("Section", "Feature Flags");

    [HttpGet]
    public IActionResult Settings() => View("Section", "Settings");
}
