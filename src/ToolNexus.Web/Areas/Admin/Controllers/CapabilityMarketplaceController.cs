using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/capabilities/marketplace")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class CapabilityMarketplaceController : Controller
{
    [HttpGet("")]
    public IActionResult Index() => View();
}
