using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/governance/decisions")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class GovernanceController : Controller
{
    [HttpGet("")]
    public IActionResult Index() => View();
}
