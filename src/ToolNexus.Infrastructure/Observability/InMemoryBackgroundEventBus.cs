using System.Collections.Concurrent;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Observability;

public sealed class InMemoryBackgroundEventBus : IBackgroundEventBus
{
    private readonly ConcurrentDictionary<Type, ConcurrentDictionary<Guid, Func<object, CancellationToken, Task>>> _handlers = new();

    public ValueTask PublishAsync<TEvent>(TEvent eventMessage, CancellationToken cancellationToken = default) where TEvent : class
    {
        ArgumentNullException.ThrowIfNull(eventMessage);

        if (!_handlers.TryGetValue(typeof(TEvent), out var subscriptions))
        {
            return ValueTask.CompletedTask;
        }

        return new ValueTask(Task.WhenAll(subscriptions.Values.Select(handler => handler(eventMessage, cancellationToken))));
    }

    public IDisposable Subscribe<TEvent>(Func<TEvent, CancellationToken, Task> handler) where TEvent : class
    {
        ArgumentNullException.ThrowIfNull(handler);

        var handlers = _handlers.GetOrAdd(typeof(TEvent), _ => new ConcurrentDictionary<Guid, Func<object, CancellationToken, Task>>());
        var subscriptionId = Guid.NewGuid();
        handlers[subscriptionId] = (payload, ct) => handler((TEvent)payload, ct);

        return new Subscription(() =>
        {
            handlers.TryRemove(subscriptionId, out _);
        });
    }

    private sealed class Subscription(Action onDispose) : IDisposable
    {
        private int _disposed;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 0)
            {
                onDispose();
            }
        }
    }
}
