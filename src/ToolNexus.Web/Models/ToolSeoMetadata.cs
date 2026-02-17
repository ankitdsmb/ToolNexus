namespace ToolNexus.Web.Models;

public sealed class ToolSeoMetadata
{
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string CanonicalUrl { get; init; }
    public required string JsonLd { get; init; }
    public required string Keywords { get; init; }
}
