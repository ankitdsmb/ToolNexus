using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Areas.Admin.Models;

namespace ToolNexus.Web.Areas.Admin.Controllers;

[Area("Admin")]
public sealed class ToolsController : Controller
{
    [HttpGet]
    public IActionResult Index()
    {
        var model = new ListDetailWorkspaceViewModel(
            WorkspaceTitle: "Tools Workspace",
            WorkspaceSubtitle: "Linear-style list/detail architecture for tool administration.",
            LeftPanelTitle: "Tools",
            LeftPanelDescription: "Table placeholder for the tools catalog, filtering, and bulk actions.",
            RightPanelTitle: "Tool Detail",
            RightPanelDescription: "Detail workspace placeholder for selected tool configuration and publishing.",
            DetailTabs: new[] { "General", "Content", "Execution", "Analytics", "Publish" });

        return View(model);
    }
}
