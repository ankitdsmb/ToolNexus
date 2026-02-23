using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
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
                    new(form.ExecutionMode, form.TimeoutSeconds, form.MaxRequestsPerMinute, form.MaxInputSize, form.IsExecutionEnabled, form.ExecutionVersionToken),
                    cancellationToken);
            }
            else
            {
                var created = await service.CreateAsync(form.ToCreate(), cancellationToken);
                await executionPolicyService.UpdateBySlugAsync(
                    created.Slug,
                    new(form.ExecutionMode, form.TimeoutSeconds, form.MaxRequestsPerMinute, form.MaxInputSize, form.IsExecutionEnabled, form.ExecutionVersionToken),
                    cancellationToken);
            }
        }
        catch (ValidationException ex)
        {
            ModelState.AddModelError(nameof(form.Slug), ex.Message);
            return View("Index", await viewModelService.BuildAsync(form, cancellationToken));
        }
        catch (ConcurrencyConflictException ex)
        {
            var conflict = BuildConflict(ex.Conflict);
            ModelState.AddModelError(string.Empty, conflict.Message);
            return View("Index", await viewModelService.BuildAsync(form, cancellationToken, conflict));
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

    private static ToolAdminConflictViewModel BuildConflict(ConcurrencyConflict conflict)
    {
        return new ToolAdminConflictViewModel
        {
            Resource = conflict.Resource,
            Message = "This item was modified by another operator.",
            ClientVersionToken = conflict.ClientVersionToken,
            ServerVersionToken = conflict.ServerVersionToken,
            LastModifiedDisplay = TryResolveLastModified(conflict.ServerState)
        };
    }

    private static string? TryResolveLastModified(object? serverState)
    {
        if (serverState is null)
        {
            return null;
        }

        if (serverState is JsonElement element)
        {
            if (TryGetDateTime(element, "updatedAt", out var value)
                || TryGetDateTime(element, "lastModifiedAt", out value)
                || TryGetDateTime(element, "modifiedAt", out value))
            {
                return value.ToLocalTime().ToString("u", CultureInfo.InvariantCulture);
            }

            return null;
        }

        var properties = serverState.GetType().GetProperties();
        foreach (var propertyName in new[] { "UpdatedAt", "LastModifiedAt", "ModifiedAt" })
        {
            var property = Array.Find(properties, p => string.Equals(p.Name, propertyName, StringComparison.OrdinalIgnoreCase));
            if (property?.GetValue(serverState) is DateTimeOffset value)
            {
                return value.ToLocalTime().ToString("u", CultureInfo.InvariantCulture);
            }
        }

        return null;
    }

    private static bool TryGetDateTime(JsonElement element, string propertyName, out DateTimeOffset value)
    {
        value = default;
        if (!element.TryGetProperty(propertyName, out var property) || property.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        return DateTimeOffset.TryParse(property.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out value);
    }

}
