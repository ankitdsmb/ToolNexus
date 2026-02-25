namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ExecutionAuthorityDecisionEntity
{
    public Guid Id { get; set; }
    public Guid ExecutionRunId { get; set; }
    public string Authority { get; set; } = string.Empty;
    public bool AdmissionAllowed { get; set; }
    public string AdmissionReason { get; set; } = string.Empty;
    public string DecisionSource { get; set; } = string.Empty;

    public ExecutionRunEntity ExecutionRun { get; set; } = null!;
}
