using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Route("admin/contact-messages")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ContactMessagesController(ToolNexusContentDbContext contentDbContext) : Controller
{
    [HttpGet("")]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var messages = await contentDbContext.ContactMessages
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(250)
            .ToListAsync(cancellationToken);

        return View(messages);
    }
}
