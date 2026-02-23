using System.Threading.Channels;

namespace ToolNexus.Infrastructure.Observability;

public sealed class BackgroundWorkQueue(BackgroundWorkerHealthState healthState) : IBackgroundWorkQueue
{
    private readonly Channel<Func<CancellationToken, ValueTask>> _channel = Channel.CreateUnbounded<Func<CancellationToken, ValueTask>>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false
        });

    public ValueTask QueueAsync(Func<CancellationToken, ValueTask> workItem, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(workItem);

        healthState.IncrementQueue();
        Func<CancellationToken, ValueTask> wrapped = async ct =>
        {
            healthState.DecrementQueue();
            await workItem(ct);
        };

        if (_channel.Writer.TryWrite(wrapped))
        {
            return ValueTask.CompletedTask;
        }

        return _channel.Writer.WriteAsync(wrapped, cancellationToken);
    }

    public IAsyncEnumerable<Func<CancellationToken, ValueTask>> DequeueAllAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}
