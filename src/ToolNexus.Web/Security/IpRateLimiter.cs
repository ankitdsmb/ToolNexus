using System.Collections.Concurrent;

namespace ToolNexus.Web.Security;

public interface IIpRateLimiter
{
    bool IsAllowed(string ipAddress);
}

public sealed class IpRateLimiter : IIpRateLimiter
{
    private static readonly TimeSpan Window = TimeSpan.FromHours(1);
    private const int MaxRequestsPerWindow = 5;

    private readonly ConcurrentDictionary<string, SlidingWindowCounter> _ipCounters = new(StringComparer.Ordinal);

    public bool IsAllowed(string ipAddress)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            return false;
        }

        var now = DateTimeOffset.UtcNow;
        var counter = _ipCounters.GetOrAdd(ipAddress, _ => new SlidingWindowCounter());
        var allowed = counter.TryConsume(now, Window, MaxRequestsPerWindow);

        if (!allowed)
        {
            return false;
        }

        PruneExpiredEntries(now);
        return true;
    }

    private void PruneExpiredEntries(DateTimeOffset now)
    {
        foreach (var pair in _ipCounters)
        {
            if (pair.Value.IsExpired(now, Window))
            {
                _ipCounters.TryRemove(pair.Key, out _);
            }
        }
    }

    private sealed class SlidingWindowCounter
    {
        private readonly Queue<DateTimeOffset> _requests = new();
        private readonly object _sync = new();

        public bool TryConsume(DateTimeOffset now, TimeSpan window, int maxRequests)
        {
            lock (_sync)
            {
                TrimOldEntries(now, window);
                if (_requests.Count >= maxRequests)
                {
                    return false;
                }

                _requests.Enqueue(now);
                return true;
            }
        }

        public bool IsExpired(DateTimeOffset now, TimeSpan window)
        {
            lock (_sync)
            {
                TrimOldEntries(now, window);
                return _requests.Count == 0;
            }
        }

        private void TrimOldEntries(DateTimeOffset now, TimeSpan window)
        {
            var threshold = now.Subtract(window);
            while (_requests.Count > 0 && _requests.Peek() < threshold)
            {
                _requests.Dequeue();
            }
        }
    }
}
