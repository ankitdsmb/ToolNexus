using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;
using ToolNexus.Web.Areas.Admin.Models;
using ToolNexus.Web.Areas.Admin.Services;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class ToolsController(IToolDefinitionService service, IExecutionPolicyService executionPolicyService, IAdminToolsViewModelService viewModelService) : Controller
{
    [HttpGet]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
        => View(await viewModelService.BuildAsync(new ToolAdminFormModel(), cancellationToken));

    [HttpGet("admin/tools/{id:int}")]
    public async Task<IActionResult> Edit([FromRoute] int id, CancellationToken cancellationToken)
    {
        var form = await viewModelService.BuildFormForEditAsync(id, cancellationToken);
        if (form is null)
        {
            return RedirectToAction(nameof(Index));
        }

        return View("Index", await viewModelService.BuildAsync(form, cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Save(ToolAdminFormModel form, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return View("Index", await viewModelService.BuildAsync(form, cancellationToken));
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
            return View("Index", await viewModelService.BuildAsync(form, cancellationToken));
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("admin/tools/{id:int}/status")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleStatus([FromRoute] int id, [FromForm] bool enabled, CancellationToken cancellationToken)
    {
        await service.SetEnabledAsync(id, enabled, cancellationToken);
        return RedirectToAction(nameof(Index));
    }

}
