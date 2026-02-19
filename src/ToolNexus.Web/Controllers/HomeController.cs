using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ToolNexus.Web.Models;
using ToolNexus.Application.Services;

namespace ToolNexus.Web.Controllers;

public sealed class HomeController(IToolCatalogService toolCatalogService, ISitemapService sitemapService) : Controller
{
    [HttpGet("/")]
    [OutputCache(Duration = 300)]
    public IActionResult Index()
    {
        var featured = toolCatalogService.GetAllTools().Take(6).ToList();
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

    [HttpGet("/privacy")]
    public IActionResult Privacy()
    {
        return View();
    }

    [HttpGet("/sitemap.xml")]
    [OutputCache(Duration = 3600)]
    public async Task<ContentResult> Sitemap(CancellationToken cancellationToken)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var xml = await sitemapService.BuildSitemapAsync(baseUrl, cancellationToken);
        return Content(xml, "application/xml", Encoding.UTF8);
    }
}
