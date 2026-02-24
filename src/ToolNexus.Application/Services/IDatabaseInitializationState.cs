namespace ToolNexus.Application.Services;

public interface IDatabaseInitializationState
{
    bool IsReady { get; }

    bool HasFailed { get; }

    string? Error { get; }

    Task WaitForReadyAsync(CancellationToken cancellationToken);
}
