using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Controllers;

public sealed class DocsController(IWebHostEnvironment environment) : Controller
{
    private static readonly Regex SlugRegex = new("^[a-z0-9-]+$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    [HttpGet("/docs")]
    public IActionResult Index()
    {
        var docsDirectory = GetDocsDirectory();
        if (!Directory.Exists(docsDirectory))
        {
            return View(new DocsIndexViewModel(Array.Empty<DocsIndexItemViewModel>()));
        }

        var pages = Directory.EnumerateFiles(docsDirectory, "*.md", SearchOption.TopDirectoryOnly)
            .Select(path =>
            {
                var slug = Path.GetFileNameWithoutExtension(path).ToLowerInvariant();
                var markdown = System.IO.File.ReadAllText(path);
                return new DocsIndexItemViewModel(slug, ResolveTitle(slug, markdown));
            })
            .OrderBy(item => item.Title)
            .ToList();

        return View(new DocsIndexViewModel(pages));
    }

    [HttpGet("/docs/{slug}")]
    public IActionResult Page(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug) || !SlugRegex.IsMatch(slug))
        {
            return NotFound();
        }

        var markdownPath = Path.Combine(GetDocsDirectory(), $"{slug}.md");
        if (!System.IO.File.Exists(markdownPath))
        {
            return NotFound();
        }

        var markdown = System.IO.File.ReadAllText(markdownPath);
        var model = new DocsPageViewModel(slug, ResolveTitle(slug, markdown), markdown);
        return View(model);
    }

    private string GetDocsDirectory() => Path.Combine(environment.ContentRootPath, "docs");

    private static string ResolveTitle(string slug, string markdown)
    {
        var heading = markdown
            .Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .FirstOrDefault(line => line.StartsWith("# ", StringComparison.Ordinal));

        return heading is not null
            ? heading[2..].Trim()
            : slug.Replace('-', ' ');
    }
}
