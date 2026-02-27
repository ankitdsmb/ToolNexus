using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Models;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AiCapabilityFactoryController(IAiToolPackageImportService importService) : Controller
{
    [HttpGet]
    public IActionResult Index() => View();

    [HttpGet("admin/ai-capability-factory/import/preview/{slug}")]
    public async Task<IActionResult> Preview(string slug, CancellationToken cancellationToken)
    {
        var contract = await importService.GetContractBySlugAsync(slug, cancellationToken);
        if (contract is null)
        {
            return NotFound();
        }

        var tool = new ToolDescriptor
        {
            Slug = contract.Slug,
            Title = contract.Slug,
            Category = "ai-import",
            SeoTitle = $"{contract.Slug} preview",
            SeoDescription = "AI imported tool package preview",
            Actions = ["run"],
            ClientSafeActions = ["run"],
            OperationSchema = new Dictionary<string, object>(),
            ExampleInput = "{}"
        };

        var viewModel = new ToolPageViewModel
        {
            Tool = tool,
            ApiBaseUrl = string.Empty,
            ToolExecutionPathPrefix = "/api/v1/tools",
            Seo = new ToolSeoMetadata
            {
                Title = $"{contract.Slug} · Admin Preview",
                Description = "Draft-only preview for imported AI tool package.",
                CanonicalUrl = string.Empty,
                Keywords = contract.Slug,
                JsonLd = "[]"
            },
            RuntimeModulePath = $"/admin/ai-capability-factory/import/preview/{Uri.EscapeDataString(contract.Slug)}/virtual-file?path=tool.js",
            RuntimeCssPath = $"/admin/ai-capability-factory/import/preview/{Uri.EscapeDataString(contract.Slug)}/virtual-file?path=tool.css",
            RuntimeUiMode = "auto",
            RuntimeComplexityTier = 1,
            ManifestEndpoint = $"/admin/ai-capability-factory/import/preview/{Uri.EscapeDataString(contract.Slug)}/manifest",
            IsAdminPreview = true
        };

        return View("~/Views/Tools/ToolShell.cshtml", viewModel);
    }
}
