using ToolNexus.Application.Models;

namespace ToolNexus.Web.Models;

public sealed class ToolManifest
{
    public List<ToolDefinition> Tools { get; init; } = [];
}
