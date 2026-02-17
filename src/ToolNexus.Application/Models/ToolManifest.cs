namespace ToolNexus.Application.Models;

public sealed class ToolManifest
{
    public required string Slug { get; init; }
    public required string Version { get; init; }
    public required string Description { get; init; }
    public required string Category { get; init; }
    public required IReadOnlyCollection<string> SupportedActions { get; init; }
    public bool IsDeterministic { get; init; } = true;
    public bool IsCpuIntensive { get; init; }
    public bool IsCacheable { get; init; } = true;
    public ToolSecurityLevel SecurityLevel { get; init; } = ToolSecurityLevel.Medium;
    public bool RequiresAuthentication { get; init; }
    public bool IsDeprecated { get; init; }
}

public enum ToolSecurityLevel
{
    Low = 0,
    Medium = 1,
    High = 2
}
