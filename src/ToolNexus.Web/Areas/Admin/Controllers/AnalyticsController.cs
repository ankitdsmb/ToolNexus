using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/analytics")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AnalyticsController : Controller
{
    [HttpGet("")]
    public IActionResult Index() => View();
}
