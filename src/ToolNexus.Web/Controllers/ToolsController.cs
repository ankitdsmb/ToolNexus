using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Services;
using ToolNexus.Web.Models;
using ToolNexus.Web.Options;

namespace ToolNexus.Web.Controllers;

[Route("tools")]
public sealed class ToolsController(
    IToolCatalogService toolCatalogService,
    IToolContentService toolContentService,
    IOptions<ApiSettings> apiSettings) : Controller
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

        var apiBaseUrl = ResolveApiBaseUrl(apiSettings.Value.BaseUrl);
        var apiPathPrefix = ResolveToolExecutionPathPrefix(apiSettings.Value.ToolExecutionPathPrefix);
        var viewModel = new ToolPageViewModel
        {
            Tool = tool,
            ApiBaseUrl = apiBaseUrl,
            ToolExecutionPathPrefix = apiPathPrefix,
            Seo = seo,
            Content = content
        };

        if (string.Equals(tool.Slug, "json-formatter", StringComparison.OrdinalIgnoreCase))
        {
            return View("JsonFormatter", viewModel);
        }
        else if (string.Equals(tool.Slug, "base64-decode", StringComparison.OrdinalIgnoreCase))
        {
            return View("base64Decode", viewModel);
        }
        else if (string.Equals(tool.Slug, "base64-encode", StringComparison.OrdinalIgnoreCase))
        {
            return View("base64Encode", viewModel);
        }
        else if (string.Equals(tool.Slug, "json-to-csv", StringComparison.OrdinalIgnoreCase))
        {
            return View("json2csv", viewModel);
        }
        else if (string.Equals(tool.Slug, "json-to-yaml", StringComparison.OrdinalIgnoreCase))
        {
            return View("jsonToYaml", viewModel);
        }
        else if (string.Equals(tool.Slug, "csv-to-json", StringComparison.OrdinalIgnoreCase))
        {
            return View("CsvToJson", viewModel);
        }
        else if (string.Equals(tool.Slug, "json-validator", StringComparison.OrdinalIgnoreCase))
        {
            return View("JsonValidator", viewModel);
        }
        else if (string.Equals(tool.Slug, "sql-formatter", StringComparison.OrdinalIgnoreCase))
        {
            return View("SqlFormatter", viewModel);
        }
        else if (string.Equals(tool.Slug, "file-merge", StringComparison.OrdinalIgnoreCase))
        {
            return View("fileMerge", viewModel);
        }
        else if (string.Equals(tool.Slug, "html-entities", StringComparison.OrdinalIgnoreCase))
        {
            return View("htmlEntities", viewModel);
        }
        else if (string.Equals(tool.Slug, "url-decode", StringComparison.OrdinalIgnoreCase))
        {
            return View("urlDecode", viewModel);
        else if (string.Equals(tool.Slug, "text-diff", StringComparison.OrdinalIgnoreCase))
        {
            return View("TextDiff", viewModel);
        }
        return View("Tool", viewModel);
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
