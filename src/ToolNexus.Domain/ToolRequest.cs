namespace ToolNexus.Domain;

public sealed record ToolRequest(string Action, string Input, IDictionary<string, string>? Options = null);
