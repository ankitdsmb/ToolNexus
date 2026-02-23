using StackExchange.Redis;

namespace ToolNexus.Infrastructure.Observability;

public sealed class RedisWorkerLock(IConnectionMultiplexer? redis) : IDistributedWorkerLock
{
    public async Task<IAsyncDisposable?> TryAcquireAsync(string lockName, TimeSpan ttl, CancellationToken cancellationToken)
    {
        if (redis is null)
        {
            return null;
        }

        var db = redis.GetDatabase();
        var token = Guid.NewGuid().ToString("N");
        var acquired = await db.StringSetAsync(lockName, token, ttl, when: When.NotExists);
        if (!acquired)
        {
            return null;
        }

        return new Releaser(db, lockName, token);
    }

    private sealed class Releaser(IDatabase db, string lockName, string token) : IAsyncDisposable
    {
        private const string ReleaseScript = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

        public async ValueTask DisposeAsync()
        {
            await db.ScriptEvaluateAsync(ReleaseScript, [lockName], [token]);
        }
    }
}
