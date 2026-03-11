namespace ToolNexus.Web.Models;

public sealed class HomeViewModel
{
    public required IReadOnlyCollection<ToolViewModel> FeaturedTools { get; init; }
}
