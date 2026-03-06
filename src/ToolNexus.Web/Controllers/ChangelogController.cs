using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Web.Controllers;

public sealed class ChangelogController(ToolNexusContentDbContext dbContext) : Controller
{
    [HttpGet("changelog")]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var entries = await dbContext.ChangelogEntries
            .AsNoTracking()
            .OrderByDescending(x => x.ReleaseDate)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return View(entries);
    }
}
