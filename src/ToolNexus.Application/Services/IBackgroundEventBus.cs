namespace ToolNexus.Application.Services;

public interface IBackgroundEventBus
{
    ValueTask PublishAsync<TEvent>(TEvent eventMessage, CancellationToken cancellationToken = default) where TEvent : class;
    IDisposable Subscribe<TEvent>(Func<TEvent, CancellationToken, Task> handler) where TEvent : class;
}
