using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Services;
using ToolNexus.Web.Areas.Admin.Models;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
public sealed class ToolsController(IToolDefinitionService service, IExecutionPolicyService executionPolicyService) : Controller
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

        var form = ToolAdminFormModel.FromDetail(detail);
        var policy = await executionPolicyService.GetBySlugAsync(detail.Slug, cancellationToken);
        form.ExecutionMode = policy.ExecutionMode;
        form.TimeoutSeconds = policy.TimeoutSeconds;
        form.MaxRequestsPerMinute = policy.MaxRequestsPerMinute;
        form.MaxInputSize = policy.MaxInputSize;
        form.IsExecutionEnabled = policy.IsExecutionEnabled;
        return View("Index", await BuildViewModelAsync(form, cancellationToken));
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
                await executionPolicyService.UpdateBySlugAsync(
                    form.Slug,
                    new(form.ExecutionMode, form.TimeoutSeconds, form.MaxRequestsPerMinute, form.MaxInputSize, form.IsExecutionEnabled),
                    cancellationToken);
            }
            else
            {
                var created = await service.CreateAsync(form.ToCreate(), cancellationToken);
                await executionPolicyService.UpdateBySlugAsync(
                    created.Slug,
                    new(form.ExecutionMode, form.TimeoutSeconds, form.MaxRequestsPerMinute, form.MaxInputSize, form.IsExecutionEnabled),
                    cancellationToken);
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
