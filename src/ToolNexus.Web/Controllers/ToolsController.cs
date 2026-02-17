using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ToolNexus.Web.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Web.Controllers;

[Route("tools")]
public sealed class ToolsController(IToolCatalogService toolCatalogService, IConfiguration configuration) : Controller
{
    [HttpGet("")]
    [OutputCache(Duration = 300)]
    public IActionResult Index()
    {
        var tools = toolCatalogService.GetAllTools();
        var categories = toolCatalogService.GetAllCategories();
        return View(new ToolIndexViewModel { Tools = tools, Categories = categories });
    }

    [HttpGet("{segment}")]
    [OutputCache(Duration = 300, VaryByRouteValueNames = ["segment"])]
    public IActionResult Segment(string segment)
    {
        if (toolCatalogService.CategoryExists(segment))
        {
            var tools = toolCatalogService.GetByCategory(segment);
            return View("Category", new ToolCategoryViewModel { Category = segment, Tools = tools });
        }

        var tool = toolCatalogService.GetBySlug(segment);
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
