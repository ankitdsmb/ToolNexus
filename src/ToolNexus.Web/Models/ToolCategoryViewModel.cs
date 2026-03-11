namespace ToolNexus.Web.Models;

public sealed class ToolCategoryViewModel
{
    public required string Category { get; init; }
    public required IReadOnlyCollection<ToolViewModel> Tools { get; init; }
}
