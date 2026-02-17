using System.Text;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

public sealed class HomeController(IManifestService manifestService, ISitemapService sitemapService) : Controller
{
    [HttpGet("/")]
    public IActionResult Index()
    {
        var featured = manifestService.GetAllTools().Take(6).ToList();
        return View(new HomeViewModel { FeaturedTools = featured });
    }

    [HttpGet("/about")]
    public IActionResult About()
    {
        return View();
    }

    [HttpGet("/disclaimer")]
    public IActionResult Disclaimer()
    {
        return View();
    }

    [HttpGet("/contact-us")]
    public IActionResult ContactUs()
    {
        return View();
    }

    [HttpGet("/sitemap.xml")]
    public ContentResult Sitemap()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var xml = sitemapService.BuildSitemap(baseUrl);
        return Content(xml, "application/xml", Encoding.UTF8);
    }
}
