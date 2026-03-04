namespace ToolNexus.Application.Models;

public sealed record AiToolGenerationRequest(string Prompt);

public sealed record AiGeneratedToolRecord(
    Guid Id,
    string Prompt,
    string Schema,
    string Manifest,
    string Status);
