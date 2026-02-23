namespace ToolNexus.Infrastructure.Observability;

public sealed class BackgroundWorkerHealthState
{
    private long _queueSize;
    private long _processedTicks;
    private int _workerActive;

    public long QueueSize => Interlocked.Read(ref _queueSize);
    public bool IsWorkerActive => Volatile.Read(ref _workerActive) == 1;
    public DateTime? LastProcessedUtc
    {
        get
        {
            var ticks = Interlocked.Read(ref _processedTicks);
            return ticks == 0 ? null : new DateTime(ticks, DateTimeKind.Utc);
        }
    }

    public void IncrementQueue() => Interlocked.Increment(ref _queueSize);

    public void DecrementQueue()
    {
        while (true)
        {
            var snapshot = Interlocked.Read(ref _queueSize);
            if (snapshot <= 0)
            {
                return;
            }

            if (Interlocked.CompareExchange(ref _queueSize, snapshot - 1, snapshot) == snapshot)
            {
                return;
            }
        }
    }

    public void SetWorkerActive(bool active) => Volatile.Write(ref _workerActive, active ? 1 : 0);

    public void MarkProcessed(DateTime timestampUtc) => Interlocked.Exchange(ref _processedTicks, timestampUtc.Ticks);
}
