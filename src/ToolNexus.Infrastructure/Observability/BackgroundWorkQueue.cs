using System.Threading.Channels;

namespace ToolNexus.Infrastructure.Observability;

public sealed class BackgroundWorkQueue(BackgroundWorkerHealthState healthState) : IBackgroundWorkQueue
{
    private const int QueueCapacity = 1_024;

    private readonly Channel<Func<CancellationToken, ValueTask>> _channel = Channel.CreateBounded<Func<CancellationToken, ValueTask>>(
        new BoundedChannelOptions(QueueCapacity)
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false,
            FullMode = BoundedChannelFullMode.Wait
        });

    public async ValueTask QueueAsync(Func<CancellationToken, ValueTask> workItem, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(workItem);

        Func<CancellationToken, ValueTask> wrapped = async ct =>
        {
            healthState.DecrementQueue();
            await workItem(ct);
        };

        healthState.IncrementQueue();

        try
        {
            if (_channel.Writer.TryWrite(wrapped))
            {
                return;
            }

            await _channel.Writer.WriteAsync(wrapped, cancellationToken);
        }
        catch
        {
            healthState.DecrementQueue();
            throw;
        }
    }

    public IAsyncEnumerable<Func<CancellationToken, ValueTask>> DequeueAllAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}
