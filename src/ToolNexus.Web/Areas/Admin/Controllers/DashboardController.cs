using Microsoft.AspNetCore.Mvc;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
public sealed class DashboardController : Controller
{
    [HttpGet]
    public IActionResult Index()
    {
        return View();
    }
}
