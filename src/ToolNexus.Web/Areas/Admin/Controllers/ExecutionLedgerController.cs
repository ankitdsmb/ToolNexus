using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/executions")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ExecutionLedgerController : Controller
{
    [HttpGet("")]
    public IActionResult Index() => View();

    [HttpGet("{id:guid}")]
    public IActionResult Detail(Guid id)
    {
        ViewData["ExecutionId"] = id;
        return View();
    }
}
