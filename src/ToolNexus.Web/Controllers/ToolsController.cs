using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ToolNexus.Application.Services;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

[Route("tools")]
public sealed class ToolsController(
    IManifestService manifestService,
    IConfiguration configuration,
    ISeoMetadataService seoMetadataService) : Controller
{
    [HttpGet("")]
    [OutputCache(Duration = 300)]
    public IActionResult Index()
    {
        var tools = manifestService.GetAllTools();
        var categories = manifestService.GetAllCategories();
        return View(new ToolIndexViewModel { Tools = tools, Categories = categories });
    }

    [HttpGet("{segment}")]
    [OutputCache(Duration = 300, VaryByRouteValueNames = ["segment"])]
    public IActionResult Segment(string segment)
    {
        if (manifestService.CategoryExists(segment))
        {
            var tools = manifestService.GetByCategory(segment);
            return View("Category", new ToolCategoryViewModel { Category = segment, Tools = tools });
        }

        var tool = manifestService.GetBySlug(segment);
        if (tool is null)
        {
            return NotFound();
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var seo = seoMetadataService.BuildToolPageMetadata(tool, baseUrl);

        var relatedTools = manifestService
            .GetByCategory(tool.Category)
            .Where(x => !x.Slug.Equals(tool.Slug, StringComparison.OrdinalIgnoreCase))
            .Take(5)
            .ToList();

        var popularTools = manifestService
            .GetAllTools()
            .Where(x => !x.Slug.Equals(tool.Slug, StringComparison.OrdinalIgnoreCase))
            .Take(5)
            .ToList();

        var apiBaseUrl = configuration["ApiBaseUrl"] ?? "http://localhost:5163";
        return View("Tool", new ToolPageViewModel
        {
            Tool = tool,
            ApiBaseUrl = apiBaseUrl,
            Seo = seo,
            RelatedTools = relatedTools,
            PopularTools = popularTools
        });
    }
}
