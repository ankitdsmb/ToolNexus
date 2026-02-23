using System.Threading;

namespace ToolNexus.Infrastructure.Content;

public enum DatabaseInitializationStatus
{
    Initializing = 0,
    Ready = 1,
    Failed = 2
}

public sealed class DatabaseInitializationState
{
    private int _status = (int)DatabaseInitializationStatus.Initializing;

    public DatabaseInitializationStatus Status => (DatabaseInitializationStatus)Volatile.Read(ref _status);

    public string? Error { get; private set; }

    public void MarkReady()
    {
        Error = null;
        Interlocked.Exchange(ref _status, (int)DatabaseInitializationStatus.Ready);
    }

    public void MarkFailed(string? error)
    {
        Error = error;
        Interlocked.Exchange(ref _status, (int)DatabaseInitializationStatus.Failed);
    }
}
