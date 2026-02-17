namespace ToolNexus.Application.Models;

public sealed class ToolDescriptor
{
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string Category { get; init; }
    public required List<string> Actions { get; init; }
    public required string SeoTitle { get; init; }
    public required string SeoDescription { get; init; }
    public required string ExampleInput { get; init; }
    public List<string> ClientSafeActions { get; init; } = [];
    public string Version { get; init; } = "1.0.0";
    public bool IsDeterministic { get; init; } = true;
    public bool IsCpuIntensive { get; init; }
    public bool IsCacheable { get; init; } = true;
    public string SecurityLevel { get; init; } = "Medium";
    public bool RequiresAuthentication { get; init; } = true;
    public bool IsDeprecated { get; init; }
}
