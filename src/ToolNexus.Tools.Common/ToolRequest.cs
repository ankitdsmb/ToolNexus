namespace ToolNexus.Tools.Common;

public sealed record ToolRequest(string Input, IDictionary<string, string>? Options = null);
