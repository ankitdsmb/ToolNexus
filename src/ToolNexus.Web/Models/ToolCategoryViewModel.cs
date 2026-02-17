using ToolNexus.Application.Models;

namespace ToolNexus.Web.Models;

public sealed class ToolCategoryViewModel
{
    public required string Category { get; init; }
    public required IReadOnlyCollection<ToolDescriptor> Tools { get; init; }
}
