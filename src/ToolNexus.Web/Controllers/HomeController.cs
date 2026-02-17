using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

public sealed class HomeController(IManifestService manifestService) : Controller
{
    [HttpGet("/")]
    [OutputCache(Duration = 300)]
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
}
