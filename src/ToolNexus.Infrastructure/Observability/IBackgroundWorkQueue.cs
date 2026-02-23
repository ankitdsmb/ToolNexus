namespace ToolNexus.Infrastructure.Observability;

public interface IBackgroundWorkQueue
{
    ValueTask QueueAsync(Func<CancellationToken, ValueTask> workItem, CancellationToken cancellationToken);

    IAsyncEnumerable<Func<CancellationToken, ValueTask>> DequeueAllAsync(CancellationToken cancellationToken);
}
