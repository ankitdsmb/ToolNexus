using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Areas.Admin.Models;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class RoadmapController(ToolNexusContentDbContext dbContext) : Controller
{
    [HttpGet("admin/roadmap")]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        await EnsureRoadmapTableAsync(cancellationToken);

        var items = await dbContext.RoadmapItems
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new RoadmapAdminItemViewModel
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

        return View(new RoadmapAdminViewModel { Items = items });
    }

    [HttpPost("admin/roadmap")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(CreateRoadmapItemFormModel form, CancellationToken cancellationToken)
    {
        await EnsureRoadmapTableAsync(cancellationToken);

        if (!ModelState.IsValid)
        {
            return await Index(cancellationToken);
        }

        dbContext.RoadmapItems.Add(new RoadmapItemEntity
        {
            Title = form.Title.Trim(),
            Description = form.Description.Trim(),
            Category = form.Category.Trim(),
            Status = form.Status.Trim(),
            Priority = form.Priority.Trim(),
            Votes = 0,
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost("admin/roadmap/{id:int}/status")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ChangeStatus([FromRoute] int id, UpdateRoadmapStatusFormModel form, CancellationToken cancellationToken)
    {
        await EnsureRoadmapTableAsync(cancellationToken);

        var item = await dbContext.RoadmapItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item is not null && !string.IsNullOrWhiteSpace(form.Status))
        {
            item.Status = form.Status.Trim();
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("admin/roadmap/{id:int}/description")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateDescription([FromRoute] int id, UpdateRoadmapDescriptionFormModel form, CancellationToken cancellationToken)
    {
        await EnsureRoadmapTableAsync(cancellationToken);

        var item = await dbContext.RoadmapItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (item is not null && !string.IsNullOrWhiteSpace(form.Description))
        {
            item.Description = form.Description.Trim();
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
