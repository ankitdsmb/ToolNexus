using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ToolNexus.Application.Services;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Controllers;

[Route("tools")]
public sealed class ToolsController(
    IToolCatalogService toolCatalogService,
    IToolContentService toolContentService,
    IConfiguration configuration) : Controller
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
    public async Task<IActionResult> Segment(string segment, CancellationToken cancellationToken)
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

        var content = await toolContentService.GetBySlugAsync(tool.Slug, cancellationToken);
        var canonicalUrl = $"{Request.Scheme}://{Request.Host}/tools/{Uri.EscapeDataString(tool.Slug)}";
        var seo = new ToolSeoMetadata
        {
            Title = content?.MetaTitle ?? tool.SeoTitle,
            Description = content?.MetaDescription ?? tool.SeoDescription,
            CanonicalUrl = canonicalUrl,
            Keywords = content?.Keywords ?? tool.Title,
            JsonLd = BuildJsonLd(tool, content, canonicalUrl)
        };

        var apiBaseUrl = configuration["ApiBaseUrl"] ?? "http://localhost:5163";
        return View("Tool", new ToolPageViewModel { Tool = tool, ApiBaseUrl = apiBaseUrl, Seo = seo, Content = content });
    }

    private static string BuildJsonLd(Application.Models.ToolDescriptor tool, Application.Models.ToolContent? content, string canonicalUrl)
    {
        var graph = new List<object>
        {
            new
            {
                @context = "https://schema.org",
                @type = "WebApplication",
                name = tool.Title,
                description = content?.MetaDescription ?? tool.SeoDescription,
                applicationCategory = $"{tool.Category} Developer Tool",
                operatingSystem = "Any",
                url = canonicalUrl
            },
            new
            {
                @context = "https://schema.org",
                @type = "BreadcrumbList",
                itemListElement = new object[]
                {
                    new { @type = "ListItem", position = 1, name = "Tools", item = "/tools" },
                    new { @type = "ListItem", position = 2, name = tool.Title, item = canonicalUrl }
                }
            }
        };

        if (content?.Faqs?.Any() == true)
        {
            graph.Add(new
            {
                @context = "https://schema.org",
                @type = "FAQPage",
                mainEntity = content.Faqs.Select(faq => new
                {
                    @type = "Question",
                    name = faq.Question,
                    acceptedAnswer = new { @type = "Answer", text = faq.Answer }
                })
            });
        }

        return System.Text.Json.JsonSerializer.Serialize(graph);
    }
}
