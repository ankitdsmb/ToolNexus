using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Web.Models;
using ToolNexus.Web.Options;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

[Route("tools")]
public sealed class ToolsController(
    IToolCatalogService toolCatalogService,
    IToolContentService toolContentService,
    IOptions<ApiSettings> apiSettings,
    IToolRegistryService toolRegistryService) : Controller
{
    [HttpGet("")]
    [OutputCache(Duration = 300)]
    public IActionResult Index()
    {
        var tools = toolCatalogService.GetAllTools();
        var categories = toolCatalogService.GetAllCategories();
        return View(new ToolIndexViewModel { Tools = tools, Categories = categories });
    }


    [HttpGet("catalog")]
    [OutputCache(Duration = 300)]
    public IActionResult Catalog()
    {
        var tools = toolCatalogService.GetAllTools()
            .Select(tool => new
            {
                slug = tool.Slug,
                title = tool.Title,
                category = tool.Category,
                description = tool.SeoDescription
            });

        return Json(tools);
    }

    [HttpGet("manifest/{slug}")]
    [OutputCache(Duration = 300, VaryByRouteValueNames = ["slug"])]
    public IActionResult Manifest(string slug)
    {
        var descriptor = toolRegistryService.GetBySlug(slug);
        if (descriptor is null)
        {
            return NotFound();
        }

        return Json(new
        {
            slug = descriptor.Slug,
            viewName = descriptor.ViewName,
            modulePath = descriptor.ModulePath,
            templatePath = descriptor.TemplatePath,
            dependencies = descriptor.Dependencies,
            styles = descriptor.Styles,
            cssPath = descriptor.CssPath
        });
    }

    [HttpGet("{segment}")]
    [OutputCache(Duration = 300, VaryByRouteValueNames = ["segment"])]
    public async Task<IActionResult> Segment(string segment, CancellationToken cancellationToken)
    {
        var normalizedSegment = segment.Trim().ToLowerInvariant();
        var categorySegment = normalizedSegment.EndsWith("-tools", StringComparison.Ordinal)
            ? normalizedSegment[..^"-tools".Length]
            : normalizedSegment;

        if (toolCatalogService.CategoryExists(categorySegment))
        {
            var tools = toolCatalogService.GetByCategory(categorySegment);
            return View("Category", new ToolCategoryViewModel { Category = categorySegment, Tools = tools });
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
            Title = content?.SeoTitle ?? tool.SeoTitle,
            Description = content?.SeoDescription ?? tool.SeoDescription,
            CanonicalUrl = canonicalUrl,
            Keywords = content?.Keywords ?? tool.Title,
            JsonLd = BuildJsonLd(tool, content, canonicalUrl)
        };

        var descriptor = toolRegistryService.GetBySlug(tool.Slug);
        var relatedTools = (content?.RelatedTools ?? [])
            .Select(related => toolCatalogService.GetBySlug(related.RelatedSlug))
            .Where(relatedTool => relatedTool is not null)
            .Select(relatedTool => new RelatedToolViewModel
            {
                Slug = relatedTool!.Slug,
                Title = relatedTool.Title
            })
            .DistinctBy(related => related.Slug)
            .ToArray();

        var sameCategoryTools = toolCatalogService.GetByCategory(tool.Category)
            .Where(candidate => !string.Equals(candidate.Slug, tool.Slug, StringComparison.OrdinalIgnoreCase))
            .Take(6)
            .Select(candidate => new RelatedToolViewModel { Slug = candidate.Slug, Title = candidate.Title })
            .ToArray();

        var sortedTools = toolCatalogService.GetAllTools().OrderBy(candidate => candidate.Title, StringComparer.OrdinalIgnoreCase).ToArray();
        var toolIndex = Array.FindIndex(sortedTools, candidate => string.Equals(candidate.Slug, tool.Slug, StringComparison.OrdinalIgnoreCase));
        var nextTools = sortedTools
            .Skip(Math.Max(toolIndex + 1, 0))
            .Take(3)
            .Select(candidate => new RelatedToolViewModel { Slug = candidate.Slug, Title = candidate.Title })
            .ToArray();

        var apiBaseUrl = ResolveApiBaseUrl(apiSettings.Value.BaseUrl);
        if (string.IsNullOrWhiteSpace(apiBaseUrl))
        {
            apiBaseUrl = $"{Request.Scheme}://{Request.Host}";
        }
        var apiPathPrefix = ResolveToolExecutionPathPrefix(apiSettings.Value.ToolExecutionPathPrefix);
        var viewModel = new ToolPageViewModel
        {
            Tool = tool,
            ApiBaseUrl = apiBaseUrl,
            ToolExecutionPathPrefix = apiPathPrefix,
            Seo = seo,
            Content = content,
            RelatedTools = relatedTools,
            SameCategoryTools = sameCategoryTools,
            NextTools = nextTools,
            RuntimeModulePath = descriptor?.ModulePath,
            RuntimeCssPath = descriptor?.CssPath
        };

        return View("ToolShell", viewModel);
    }

    private static string ResolveApiBaseUrl(string? configuredApiBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(configuredApiBaseUrl))
        {
            return string.Empty;
        }

        var normalized = configuredApiBaseUrl.Trim().TrimEnd('/');

        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri))
        {
            return string.Empty;
        }

        return uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
    }


    private static string ResolveToolExecutionPathPrefix(string? configuredPathPrefix)
    {
        if (string.IsNullOrWhiteSpace(configuredPathPrefix))
        {
            return "/api/v1/tools";
        }

        var normalized = configuredPathPrefix.Trim();
        if (!normalized.StartsWith('/'))
        {
            normalized = $"/{normalized}";
        }

        return normalized.TrimEnd('/');
    }

    private static string BuildJsonLd(Application.Models.ToolDescriptor tool, Application.Models.ToolContent? content, string canonicalUrl)
    {
        var graph = new List<Dictionary<string, object?>>
        {
            new()
            {
                ["@context"] = "https://schema.org",
                ["@type"] = "SoftwareApplication",
                ["name"] = tool.Title,
                ["description"] = content?.SeoDescription ?? tool.SeoDescription,
                ["applicationCategory"] = $"{tool.Category} Developer Tool",
                ["operatingSystem"] = "Any",
                ["url"] = canonicalUrl
            },
            new()
            {
                ["@context"] = "https://schema.org",
                ["@type"] = "BreadcrumbList",
                ["itemListElement"] = new object[]
                {
                    new Dictionary<string, object?> { ["@type"] = "ListItem", ["position"] = 1, ["name"] = "Tools", ["item"] = "/tools" },
                    new Dictionary<string, object?> { ["@type"] = "ListItem", ["position"] = 2, ["name"] = tool.Title, ["item"] = canonicalUrl }
                }
            }
        };

        if (content?.Faq?.Any() == true)
        {
            graph.Add(new Dictionary<string, object?>
            {
                ["@context"] = "https://schema.org",
                ["@type"] = "FAQPage",
                ["mainEntity"] = content.Faq.Select(faq => new Dictionary<string, object?>
                {
                    ["@type"] = "Question",
                    ["name"] = faq.Question,
                    ["acceptedAnswer"] = new Dictionary<string, object?> { ["@type"] = "Answer", ["text"] = faq.Answer }
                }).ToArray()
            });
        }

        return System.Text.Json.JsonSerializer.Serialize(graph);
    }
}
