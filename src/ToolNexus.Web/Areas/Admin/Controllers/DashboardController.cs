using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class DashboardController : Controller
{
    [HttpGet]
    public IActionResult Index()
    {
        return View();
    }
}
