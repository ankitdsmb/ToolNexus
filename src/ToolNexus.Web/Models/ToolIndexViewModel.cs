namespace ToolNexus.Web.Models;

public sealed class ToolIndexViewModel
{
    public required IReadOnlyCollection<ToolDefinition> Tools { get; init; }
    public required IReadOnlyCollection<string> Categories { get; init; }
}
