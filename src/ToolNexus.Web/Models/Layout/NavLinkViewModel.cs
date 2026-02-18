namespace ToolNexus.Web.Models.Layout;

public sealed class NavLinkViewModel
{
    public required string Text { get; init; }
    public required string Href { get; init; }
    public bool IsActive { get; init; }
}
