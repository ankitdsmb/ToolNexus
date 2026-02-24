using System.Threading;

using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Content;

public enum DatabaseInitializationStatus
{
    Initializing = 0,
    Ready = 1,
    Failed = 2
}

public sealed class DatabaseInitializationState : IDatabaseInitializationState
{
    private int _status = (int)DatabaseInitializationStatus.Initializing;
    private readonly TaskCompletionSource _readyCompletion = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public DatabaseInitializationStatus Status => (DatabaseInitializationStatus)Volatile.Read(ref _status);
    public bool IsReady => Status == DatabaseInitializationStatus.Ready;
    public bool HasFailed => Status == DatabaseInitializationStatus.Failed;

    public string? Error { get; private set; }

    public void MarkReady()
    {
        Error = null;
        Interlocked.Exchange(ref _status, (int)DatabaseInitializationStatus.Ready);
        _readyCompletion.TrySetResult();
    }

    public void MarkFailed(string? error)
    {
        Error = error;
        Interlocked.Exchange(ref _status, (int)DatabaseInitializationStatus.Failed);
        _readyCompletion.TrySetException(new InvalidOperationException(error ?? "Database initialization failed."));
    }

    public Task WaitForReadyAsync(CancellationToken cancellationToken)
    {
        if (IsReady)
        {
            return Task.CompletedTask;
        }

        if (HasFailed)
        {
            return Task.FromException(new InvalidOperationException(Error ?? "Database initialization failed."));
        }

        return _readyCompletion.Task.WaitAsync(cancellationToken);
    }
}
