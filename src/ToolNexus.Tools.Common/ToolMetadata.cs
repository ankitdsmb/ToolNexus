namespace ToolNexus.Tools.Common;

public sealed record ToolMetadata(
    string Name,
    string Description,
    string Category,
    string ExampleInput,
    IReadOnlyCollection<string> CapabilityTags);
