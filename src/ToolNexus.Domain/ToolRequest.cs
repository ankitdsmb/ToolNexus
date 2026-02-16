namespace ToolNexus.Domain;

public sealed record ToolRequest(string Input, IDictionary<string, string>? Options = null);
