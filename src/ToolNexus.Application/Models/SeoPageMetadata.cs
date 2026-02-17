namespace ToolNexus.Application.Models;

public sealed class SeoPageMetadata
{
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string CanonicalUrl { get; init; }
    public required string OpenGraphType { get; init; }
    public required string TwitterCard { get; init; }
    public string? JsonLd { get; init; }
}
