using System.Text.Json.Serialization;

namespace ToolNexus.Web.Models;

public sealed class ToolManifestDocument
{
    public string SchemaVersion { get; init; } = "1.0";
    public List<ToolManifestItem> Tools { get; init; } = [];
}

public sealed class LegacyToolManifestDocument
{
    [JsonPropertyName("tools")]
    public List<LegacyToolDefinition> Tools { get; init; } = [];
}

public sealed class ToolManifestItem
{
    public required string Slug { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required string Category { get; init; }
    public required List<ToolActionItem> Actions { get; init; }
    public required ToolCapabilityItem Capabilities { get; init; }
    public string SeoTitle { get; init; } = string.Empty;
    public string SeoDescription { get; init; } = string.Empty;
    public string ExampleInput { get; init; } = string.Empty;
}

public sealed class ToolActionItem
{
    public required string Name { get; init; }
    public string Description { get; init; } = string.Empty;
    public bool IsDefault { get; init; }
}

public sealed class ToolCapabilityItem
{
    public bool SupportsClientExecution { get; init; }
    public bool SupportsStreaming { get; init; }
    public bool IsCacheable { get; init; }
}

public sealed class LegacyToolDefinition
{
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string Category { get; init; }
    public required List<string> Actions { get; init; }
    public required string SeoTitle { get; init; }
    public required string SeoDescription { get; init; }
    public required string ExampleInput { get; init; }
    public List<string> ClientSafeActions { get; init; } = [];
}

public sealed class ToolDefinition
{
    public required string Slug { get; init; }
    public required string Title { get; init; }
    public required string Category { get; init; }
    public required List<string> Actions { get; init; }
    public required string SeoTitle { get; init; }
    public required string SeoDescription { get; init; }
    public required string ExampleInput { get; init; }
    public bool SupportsClientExecution { get; init; }
    public List<string> ClientSafeActions { get; init; } = [];
}
