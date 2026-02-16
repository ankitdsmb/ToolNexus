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
        var categories = manifestService.GetAllCategories();
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

        var canonicalUrl = $"{Request.Scheme}://{Request.Host}/tools/{Uri.EscapeDataString(tool.Slug)}";
        var seo = new ToolSeoMetadata
        {
            Title = tool.SeoTitle,
            Description = tool.SeoDescription,
            CanonicalUrl = canonicalUrl,
            JsonLd = System.Text.Json.JsonSerializer.Serialize(new
            {
                @context = "https://schema.org",
                @type = "SoftwareApplication",
                name = tool.Title,
                description = tool.SeoDescription,
                applicationCategory = $"{tool.Category} Developer Tool",
                operatingSystem = "Any",
                url = canonicalUrl,
                offers = new
                {
                    @type = "Offer",
                    price = "0",
                    priceCurrency = "USD"
                }
            })
        };

        var apiBaseUrl = configuration["ApiBaseUrl"] ?? "http://localhost:5163";
        return View("Tool", new ToolPageViewModel { Tool = tool, ApiBaseUrl = apiBaseUrl, Seo = seo });
    }
}
