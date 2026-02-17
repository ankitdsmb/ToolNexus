namespace ToolNexus.Application.Models;

public sealed record ToolManifestV1(
    string SchemaVersion,
    string Slug,
    string Name,
    string Description,
    string Category,
    IReadOnlyCollection<ToolActionDefinition> Actions,
    ToolCapabilities Capabilities);

public sealed record ToolActionDefinition(
    string Name,
    string Description,
    bool IsDefault);

public sealed record ToolCapabilities(
    bool SupportsClientExecution,
    bool SupportsStreaming,
    bool IsCacheable);
