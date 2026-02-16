namespace ToolNexus.Web.Models;

public sealed class ToolPageViewModel
{
    public required ToolDefinition Tool { get; init; }
    public required string ApiBaseUrl { get; init; }
    public required ToolSeoMetadata Seo { get; init; }
}
