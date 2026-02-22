namespace ToolNexus.Web.Areas.Admin.Models;

public sealed record ListDetailWorkspaceViewModel(
    string WorkspaceTitle,
    string WorkspaceSubtitle,
    string LeftPanelTitle,
    string LeftPanelDescription,
    string RightPanelTitle,
    string RightPanelDescription,
    IReadOnlyList<string> DetailTabs);
