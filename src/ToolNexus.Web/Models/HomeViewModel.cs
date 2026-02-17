using ToolNexus.Application.Models;

namespace ToolNexus.Web.Models;

public sealed class HomeViewModel
{
    public required IReadOnlyCollection<ToolDefinition> FeaturedTools { get; init; }
}
