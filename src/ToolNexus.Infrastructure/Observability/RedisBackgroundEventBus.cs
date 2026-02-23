using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using ToolNexus.Application.Services;

namespace ToolNexus.Infrastructure.Observability;

public sealed class RedisBackgroundEventBus(
    InMemoryBackgroundEventBus localBus,
    ILogger<RedisBackgroundEventBus> logger,
    IConnectionMultiplexer? redis = null) : IBackgroundEventBus
{
    private readonly ConcurrentDictionary<Type, bool> _subscribedTypes = new();
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    public async ValueTask PublishAsync<TEvent>(TEvent eventMessage, CancellationToken cancellationToken = default) where TEvent : class
    {
        await localBus.PublishAsync(eventMessage, cancellationToken);

        if (redis is null)
        {
            return;
        }

        try
        {
            var channel = BuildChannel(typeof(TEvent));
            var payload = JsonSerializer.Serialize(eventMessage, _jsonOptions);
            await redis.GetSubscriber().PublishAsync(RedisChannel.Literal(channel), payload);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to publish {EventType} to Redis background event bus.", typeof(TEvent).Name);
        }
    }

    public IDisposable Subscribe<TEvent>(Func<TEvent, CancellationToken, Task> handler) where TEvent : class
    {
        var subscription = localBus.Subscribe(handler);

        if (redis is null)
        {
            return subscription;
        }

        EnsureRedisSubscription<TEvent>();
        return subscription;
    }

    private void EnsureRedisSubscription<TEvent>() where TEvent : class
    {
        var eventType = typeof(TEvent);
        if (!_subscribedTypes.TryAdd(eventType, true))
        {
            return;
        }

        var channel = BuildChannel(eventType);
        _ = redis!.GetSubscriber().SubscribeAsync(RedisChannel.Literal(channel), async (_, redisValue) =>
        {
            try
            {
                var message = JsonSerializer.Deserialize<TEvent>(redisValue.ToString(), _jsonOptions);
                if (message is null)
                {
                    return;
                }

                await localBus.PublishAsync(message, CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to handle {EventType} event from Redis bus.", eventType.Name);
            }
        });
    }

    private static string BuildChannel(Type eventType)
        => $"toolnexus:events:{eventType.FullName}";
}
