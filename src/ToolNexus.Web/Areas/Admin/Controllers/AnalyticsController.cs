using Microsoft.AspNetCore.Mvc;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/analytics")]
public sealed class AnalyticsController : Controller
{
    [HttpGet("")]
    public IActionResult Index() => View();
}
