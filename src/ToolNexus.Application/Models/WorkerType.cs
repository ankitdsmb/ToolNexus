namespace ToolNexus.Application.Models;

/// <summary>
/// Immutable worker identity combining runtime language and execution capability.
/// </summary>
public sealed record WorkerType
{
    public required ToolRuntimeLanguage Language { get; init; }
    public required ToolExecutionCapability Capability { get; init; }

    public static WorkerType Create(ToolRuntimeLanguage language, ToolExecutionCapability capability)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(language.Value);
        ArgumentException.ThrowIfNullOrWhiteSpace(capability.Value);

        return new WorkerType
        {
            Language = language,
            Capability = capability
        };
    }

    public override string ToString() => $"{Language.Value}:{Capability.Value}";
}

