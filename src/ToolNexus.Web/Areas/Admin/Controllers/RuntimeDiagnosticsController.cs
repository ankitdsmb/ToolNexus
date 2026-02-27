using Microsoft.AspNetCore.Mvc;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/runtime-diagnostics")]
public sealed class RuntimeDiagnosticsController : Controller
{
    [HttpGet("")]
    public IActionResult Index()
    {
        return View();
    }
}
