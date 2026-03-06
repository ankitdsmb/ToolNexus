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
public sealed class ChangelogController(ToolNexusContentDbContext dbContext) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var entries = await dbContext.ChangelogEntries
            .AsNoTracking()
            .OrderByDescending(x => x.ReleaseDate)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        ViewBag.Form = new ChangelogEntryFormModel();
        return View(entries);
    }

    [HttpGet("admin/changelog/{id:guid}")]
    public async Task<IActionResult> Edit([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var entries = await dbContext.ChangelogEntries
            .AsNoTracking()
            .OrderByDescending(x => x.ReleaseDate)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var entry = entries.FirstOrDefault(x => x.Id == id);
        if (entry is null)
        {
            return RedirectToAction(nameof(Index));
        }

        ViewBag.Form = new ChangelogEntryFormModel
        {
            Id = entry.Id,
            Version = entry.Version,
            Title = entry.Title,
            Description = entry.Description,
            Tag = entry.Tag,
            ReleaseDate = entry.ReleaseDate.Date
        };

        return View("Index", entries);
    }

    [HttpPost]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Save(ChangelogEntryFormModel form, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            var invalidEntries = await dbContext.ChangelogEntries.AsNoTracking().OrderByDescending(x => x.ReleaseDate).ToListAsync(cancellationToken);
            ViewBag.Form = form;
            return View("Index", invalidEntries);
        }

        if (form.Id.HasValue)
        {
            var existing = await dbContext.ChangelogEntries.FirstOrDefaultAsync(x => x.Id == form.Id.Value, cancellationToken);
            if (existing is null)
            {
                return RedirectToAction(nameof(Index));
            }

            existing.Version = form.Version.Trim();
            existing.Title = form.Title.Trim();
            existing.Description = form.Description.Trim();
            existing.Tag = form.Tag;
            existing.ReleaseDate = new DateTimeOffset(DateTime.SpecifyKind(form.ReleaseDate, DateTimeKind.Utc));
        }
        else
        {
            dbContext.ChangelogEntries.Add(new ChangelogEntryEntity
            {
                Id = Guid.NewGuid(),
                Version = form.Version.Trim(),
                Title = form.Title.Trim(),
                Description = form.Description.Trim(),
                Tag = form.Tag,
                ReleaseDate = new DateTimeOffset(DateTime.SpecifyKind(form.ReleaseDate, DateTimeKind.Utc)),
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return RedirectToAction(nameof(Index));
    }

    [HttpPost("admin/changelog/{id:guid}/delete")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var entry = await dbContext.ChangelogEntries.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entry is null)
        {
            return RedirectToAction(nameof(Index));
        }

        dbContext.ChangelogEntries.Remove(entry);
        await dbContext.SaveChangesAsync(cancellationToken);
        return RedirectToAction(nameof(Index));
    }
}
