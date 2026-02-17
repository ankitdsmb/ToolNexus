using ToolNexus.Application.Models;

namespace ToolNexus.Web.Models;

public sealed class ToolIndexViewModel
{
    public required IReadOnlyCollection<ToolDescriptor> Tools { get; init; }
    public required IReadOnlyCollection<string> Categories { get; init; }
}
