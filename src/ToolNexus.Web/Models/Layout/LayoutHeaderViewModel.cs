namespace ToolNexus.Web.Models.Layout;

public sealed class LayoutHeaderViewModel
{
    public required IReadOnlyList<NavLinkViewModel> Links { get; init; }
}
