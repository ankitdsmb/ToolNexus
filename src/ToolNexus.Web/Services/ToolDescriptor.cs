namespace ToolNexus.Web.Services;

public sealed class ToolDescriptor
{
    public string Slug { get; init; } = string.Empty;
    public string ViewName { get; init; } = string.Empty;
    public string ModulePath { get; init; } = string.Empty;
    public string TemplatePath { get; init; } = string.Empty;
    public string[] Dependencies { get; init; } = [];
    public string[] Styles { get; init; } = [];
    public string? CssPath => Styles.FirstOrDefault();
    public string Category { get; init; } = string.Empty;
    public string UiMode { get; init; } = "auto";
    public int ComplexityTier { get; init; } = 1;
}
