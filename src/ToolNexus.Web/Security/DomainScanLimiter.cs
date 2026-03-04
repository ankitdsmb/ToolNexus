using System.Collections.Concurrent;

namespace ToolNexus.Web.Security;

public interface IDomainScanLimiter
{
    bool IsAllowed(string domain);
}

public sealed class DomainScanLimiter : IDomainScanLimiter
{
    private static readonly TimeSpan Window = TimeSpan.FromHours(1);
    private const int MaxScansPerDomain = 5;

    private readonly ConcurrentDictionary<string, SlidingWindowCounter> _domainCounters = new(StringComparer.OrdinalIgnoreCase);

    public bool IsAllowed(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            return false;
        }

        var normalizedDomain = domain.Trim().ToLowerInvariant();
        var now = DateTimeOffset.UtcNow;
        var counter = _domainCounters.GetOrAdd(normalizedDomain, _ => new SlidingWindowCounter());

        var allowed = counter.TryConsume(now, Window, MaxScansPerDomain);
        if (!allowed)
        {
            return false;
        }

        PruneExpiredEntries(now);
        return true;
    }

    private void PruneExpiredEntries(DateTimeOffset now)
    {
        foreach (var pair in _domainCounters)
        {
            if (pair.Value.IsExpired(now, Window))
            {
                _domainCounters.TryRemove(pair.Key, out _);
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
