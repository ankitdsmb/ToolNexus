using System.Text;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

public sealed class HomeController(IManifestService manifestService) : Controller
{
    [HttpGet("/")]
    public IActionResult Index()
    {
        var featured = manifestService.GetAllTools().Take(6).ToList();
        return View(new HomeViewModel { FeaturedTools = featured });
    }

    [HttpGet("/sitemap.xml")]
    public ContentResult Sitemap()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var urls = new List<string>
        {
            $"{baseUrl}/",
            $"{baseUrl}/tools"
        };

        urls.AddRange(manifestService.GetAllCategories().Select(category => $"{baseUrl}/tools/{Uri.EscapeDataString(category)}"));
        urls.AddRange(manifestService.GetAllTools().Select(tool => $"{baseUrl}/tools/{Uri.EscapeDataString(tool.Slug)}"));

        var xml = new StringBuilder();
        xml.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        xml.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        foreach (var url in urls)
        {
            xml.AppendLine("  <url>");
            xml.AppendLine($"    <loc>{System.Security.SecurityElement.Escape(url)}</loc>");
            xml.AppendLine("  </url>");
        }
        xml.AppendLine("</urlset>");

        return Content(xml.ToString(), "application/xml", Encoding.UTF8);
    }
}
