using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

[Route("tools")]
public sealed class ToolsController(IManifestService manifestService, IConfiguration configuration) : Controller
{
    [HttpGet("")]
    public IActionResult Index()
    {
        var tools = manifestService.GetAllTools();
        var categories = tools.Select(x => x.Category).Distinct(StringComparer.OrdinalIgnoreCase).Order().ToList();
        return View(new ToolIndexViewModel { Tools = tools, Categories = categories });
    }

    [HttpGet("{segment}")]
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

        var apiBaseUrl = configuration["ApiBaseUrl"] ?? "http://localhost:5163";
        return View("Tool", new ToolPageViewModel { Tool = tool, ApiBaseUrl = apiBaseUrl });
    }
}
