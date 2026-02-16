namespace ToolNexus.Application.Models;

public sealed record ToolExecutionRequest(string Slug, string Action, string Input, IDictionary<string, string>? Options = null);
