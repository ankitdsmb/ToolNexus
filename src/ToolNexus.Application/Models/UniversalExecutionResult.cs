using ToolNexus.Application.Abstractions;

namespace ToolNexus.Application.Models;

public sealed record UniversalExecutionResult(
    ToolExecutionResponse Response,
    ToolRuntimeLanguage Language,
    string AdapterName,
    string AdapterResolutionStatus);
