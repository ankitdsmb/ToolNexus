using ToolNexus.Application.Models;

namespace ToolNexus.Web.Models;

public sealed class HomeViewModel
{
    public required IReadOnlyCollection<ToolDescriptor> FeaturedTools { get; init; }
}
