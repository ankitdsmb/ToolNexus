using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

public sealed class DocsController(DocsService docsService) : Controller
{
    [HttpGet("/docs/{**docPath}")]
    public async Task<IActionResult> Show(string docPath, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(docPath))
        {
            return BadRequest("Document path is required.");
        }

        var normalizedPath = docPath.EndsWith(".md", StringComparison.OrdinalIgnoreCase)
            ? docPath
            : $"{docPath}.md";

        try
        {
            var html = await docsService.RenderDocumentAsync(normalizedPath, cancellationToken);
            return View("Doc", html);
        }
        catch (FileNotFoundException)
        {
            return NotFound();
        }
    }
}
