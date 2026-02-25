namespace ToolNexus.Application.Services.Pipeline;

public sealed record WorkerPreparationResult(
    bool IsPrepared,
    string Status,
    string Message)
{
    public static WorkerPreparationResult Placeholder { get; } = new(
        IsPrepared: true,
        Status: "placeholder",
        Message: "Worker runtime preparation is scaffolded and execution is intentionally disabled in this phase.");
}
