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
}
