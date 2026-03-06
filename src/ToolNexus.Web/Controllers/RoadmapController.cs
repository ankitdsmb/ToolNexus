using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Controllers;

public sealed class RoadmapController(ToolNexusContentDbContext dbContext) : Controller
{
    [HttpGet("/roadmap")]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        await EnsureRoadmapTableAsync(cancellationToken);

        var items = await dbContext.RoadmapItems
            .OrderByDescending(x => x.Votes)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new RoadmapItemCardViewModel
            {
                Id = x.Id,
                Title = x.Title,
                Description = x.Description,
                Category = x.Category,
                Status = x.Status,
                Priority = x.Priority,
                Votes = x.Votes,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var model = new RoadmapPageViewModel
        {
            Planned = items.Where(x => x.Status.Equals("Planned", StringComparison.OrdinalIgnoreCase)).ToList(),
            InProgress = items.Where(x => x.Status.Equals("In Progress", StringComparison.OrdinalIgnoreCase)).ToList(),
            Completed = items.Where(x => x.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase)).ToList()
        };

        return View(model);
    }

    [HttpPost("/roadmap/{id:int}/vote")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Vote([FromRoute] int id, CancellationToken cancellationToken)
    {
        await EnsureRoadmapTableAsync(cancellationToken);

        var item = await dbContext.RoadmapItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item is not null)
        {
            item.Votes += 1;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return RedirectToAction(nameof(Index));
    }

    private async Task EnsureRoadmapTableAsync(CancellationToken cancellationToken)
    {
        if (dbContext.Database.IsSqlite())
        {
            await dbContext.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS roadmap_items (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Title TEXT NOT NULL,
                    Description TEXT NOT NULL,
                    Category TEXT NOT NULL,
                    Status TEXT NOT NULL,
                    Priority TEXT NOT NULL,
                    Votes INTEGER NOT NULL DEFAULT 0,
                    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """,
                cancellationToken);
            return;
        }

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS roadmap_items (
                "Id" SERIAL PRIMARY KEY,
                "Title" VARCHAR(160) NOT NULL,
                "Description" VARCHAR(1500) NOT NULL,
                "Category" VARCHAR(80) NOT NULL,
                "Status" VARCHAR(40) NOT NULL,
                "Priority" VARCHAR(40) NOT NULL,
                "Votes" INTEGER NOT NULL DEFAULT 0,
                "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """,
            cancellationToken);
    }
}
