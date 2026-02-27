using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Areas.Admin.Controllers.Api;

[ApiController]
[Route("admin/ai-capability-factory")]
[Authorize(Policy = AdminPolicyNames.AdminRead)]
public sealed class AiCapabilityFactoryController(
    IAiCapabilityFactoryService service,
    IAiToolPackageImportService importService) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<AiCapabilityFactoryDashboard>> Dashboard([FromQuery] int take = 50, CancellationToken cancellationToken = default)
        => Ok(await service.GetDashboardAsync(take, cancellationToken));

    [HttpGet("import/template")]
    public ActionResult<AiToolPackageTemplateResponse> GetImportTemplate()
        => Ok(importService.GetTemplate());

    [HttpPost("import/generate-contract")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiToolContractGenerationResponse>> GenerateContract([FromBody] AiToolContractGenerationRequest request, CancellationToken cancellationToken)
        => Ok(await importService.GenerateContractAsync(request, cancellationToken));

    [HttpPost("import/validate")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiToolPackageImportValidationResult>> ValidateImport([FromBody] AiToolPackageImportRequest request, CancellationToken cancellationToken)
        => Ok(await importService.ValidateAsync(request.JsonPayload, cancellationToken));

    [HttpPost("import")]
    [Authorize(Policy = AdminPolicyNames.AdminWrite)]
    public async Task<ActionResult<AiToolPackageRecord>> Import([FromBody] AiToolPackageImportRequest request, CancellationToken cancellationToken)
        => Ok(await importService.CreateDraftAsync(request, cancellationToken));

    [HttpGet("import/preview/{slug}/manifest")]
    public async Task<IActionResult> PreviewManifest(string slug, CancellationToken cancellationToken)
    {
        var contract = await importService.GetContractBySlugAsync(slug, cancellationToken);
        if (contract is null)
        {
            return NotFound();
        }

        return Ok(new
        {
            slug = contract.Slug,
            viewName = "ToolShell",
            modulePath = $"/admin/ai-capability-factory/import/preview/{Uri.EscapeDataString(contract.Slug)}/virtual-file?path=tool.js",
            templatePath = $"/admin/ai-capability-factory/import/preview/{Uri.EscapeDataString(contract.Slug)}/virtual-file?path=tool.html",
            cssPath = $"/admin/ai-capability-factory/import/preview/{Uri.EscapeDataString(contract.Slug)}/virtual-file?path=tool.css",
            dependencies = Array.Empty<string>(),
            styles = new[] { $"/admin/ai-capability-factory/import/preview/{Uri.EscapeDataString(contract.Slug)}/virtual-file?path=tool.css" },
            uiMode = "auto",
            complexityTier = 1
        });
    }

    [HttpGet("import/preview/{slug}/virtual-file")]
    public async Task<IActionResult> PreviewVirtualFile(string slug, [FromQuery] string path, CancellationToken cancellationToken)
    {
        var contract = await importService.GetContractBySlugAsync(slug, cancellationToken);
        if (contract is null)
        {
            return NotFound();
        }

        var file = contract.Files.FirstOrDefault(x => string.Equals(x.Path, path, StringComparison.OrdinalIgnoreCase));
        if (file is null)
        {
            return NotFound();
        }

        var contentType = file.Type switch
        {
            "js" => "application/javascript",
            "html" => "text/html",
            "css" => "text/css",
            "json" => "application/json",
            _ => "text/plain"
        };

        return Content(file.Content, contentType);
    }
}
