namespace ToolNexus.Web.Services;

public sealed class ToolManifest
{
    public string Slug { get; init; } = string.Empty;
    public string ViewName { get; init; } = string.Empty;
    public string ModulePath { get; init; } = string.Empty;
    public string? CssPath { get; init; }
    public string Category { get; init; } = string.Empty;
}
