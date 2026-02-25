using ToolNexus.Application.Abstractions;

namespace ToolNexus.Application.Models;

public sealed record UniversalExecutionRequest(
    string ToolId,
    string Action,
    string Input,
    ToolRuntimeLanguage Language,
    IReadOnlyDictionary<string, string> Context,
    string? CorrelationId,
    IDictionary<string, string>? Options = null);
