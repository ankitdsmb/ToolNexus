using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Models;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
public sealed class ToolsController(IToolDefinitionService service) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
        => View(await BuildViewModelAsync(new ToolAdminFormModel(), cancellationToken));

    [HttpGet("admin/tools/{id:int}")]
    public async Task<IActionResult> Edit([FromRoute] int id, CancellationToken cancellationToken)
    {
        var detail = await service.GetByIdAsync(id, cancellationToken);
        if (detail is null)
        {
            return RedirectToAction(nameof(Index));
        }

        return View("Index", await BuildViewModelAsync(ToolAdminFormModel.FromDetail(detail), cancellationToken));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Save(ToolAdminFormModel form, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return View("Index", await BuildViewModelAsync(form, cancellationToken));
        }

        try
        {
            if (form.Id.HasValue)
            {
                await service.UpdateAsync(form.Id.Value, form.ToUpdate(), cancellationToken);
            }
            else
            {
                await service.CreateAsync(form.ToCreate(), cancellationToken);
            }
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(nameof(form.Slug), ex.Message);
            return View("Index", await BuildViewModelAsync(form, cancellationToken));
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("admin/tools/{id:int}/status")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleStatus([FromRoute] int id, [FromForm] bool enabled, CancellationToken cancellationToken)
    {
        await service.SetEnabledAsync(id, enabled, cancellationToken);
        return RedirectToAction(nameof(Index));
    }

    private async Task<ToolAdminIndexViewModel> BuildViewModelAsync(ToolAdminFormModel form, CancellationToken cancellationToken)
        => new()
        {
            Tools = await service.GetListAsync(cancellationToken),
            Form = form
        };
}
