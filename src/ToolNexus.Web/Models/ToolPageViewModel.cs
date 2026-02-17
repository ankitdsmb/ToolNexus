using ToolNexus.Application.Models;

namespace ToolNexus.Web.Models;

public sealed class ToolPageViewModel
{
    public required ToolDefinition Tool { get; init; }
    public required string ApiBaseUrl { get; init; }
    public required SeoPageMetadata Seo { get; init; }
    public required IReadOnlyCollection<ToolDefinition> RelatedTools { get; init; }
    public required IReadOnlyCollection<ToolDefinition> PopularTools { get; init; }
}
