namespace ToolNexus.Application.Models;

public sealed record ExecutionAdmissionDecision(
    bool IsAllowed,
    string ReasonCode,
    string DecisionSource,
    IReadOnlyDictionary<string, string> Metadata)
{
    public static ExecutionAdmissionDecision Allowed(string decisionSource, IReadOnlyDictionary<string, string>? metadata = null)
        => new(true, "Allowed", decisionSource, metadata ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase));
}
