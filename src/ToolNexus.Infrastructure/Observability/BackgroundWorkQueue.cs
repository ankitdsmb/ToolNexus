using System.Threading.Channels;

namespace ToolNexus.Infrastructure.Observability;

public sealed class BackgroundWorkQueue : IBackgroundWorkQueue
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

        if (_channel.Writer.TryWrite(workItem))
        {
            return ValueTask.CompletedTask;
        }

        return _channel.Writer.WriteAsync(workItem, cancellationToken);
    }

    public IAsyncEnumerable<Func<CancellationToken, ValueTask>> DequeueAllAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}
