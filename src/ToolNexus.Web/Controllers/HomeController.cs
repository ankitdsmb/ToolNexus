using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

public sealed class HomeController(IManifestService manifestService, ISitemapService sitemapService) : Controller
{
    [HttpGet("/")]
    [OutputCache(Duration = 300)]
    public IActionResult Index()
    {
        var featured = manifestService.GetAllTools().Take(6).ToList();
        return View(new HomeViewModel { FeaturedTools = featured });
    }

    [HttpGet("/sitemap.xml")]
    [OutputCache(Duration = 3600)]
    public ContentResult Sitemap()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var xml = sitemapService.BuildSitemap(baseUrl);
        return Content(xml, "application/xml", Encoding.UTF8);
    }
}
