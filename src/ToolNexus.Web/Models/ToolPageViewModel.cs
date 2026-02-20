using ToolNexus.Application.Models;

namespace ToolNexus.Web.Models;

public sealed class ToolPageViewModel
{
    public required ToolDescriptor Tool { get; init; }
    public required string ApiBaseUrl { get; init; }
    public required string ToolExecutionPathPrefix { get; init; }
    public required ToolSeoMetadata Seo { get; init; }
    public string? RuntimeModulePath { get; init; }
    public string? RuntimeCssPath { get; init; }
    public ToolContent? Content { get; init; }
}
