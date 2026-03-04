using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Distributed;

namespace ToolNexus.Web.Security;

public interface IDomainScanLimiter
{
    bool IsAllowed(string domain);
}

public sealed class DomainScanLimiter(IDistributedCache? distributedCache = null) : IDomainScanLimiter
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

        if (distributedCache is not null)
        {
            return IsAllowedDistributed(normalizedDomain, now);
        }

        var counter = _domainCounters.GetOrAdd(normalizedDomain, _ => new SlidingWindowCounter());
        var allowed = counter.TryConsume(now, Window, MaxScansPerDomain);
        if (!allowed)
        {
            return false;
        }

        PruneExpiredEntries(now);
        return true;
    }

    private bool IsAllowedDistributed(string domain, DateTimeOffset now)
    {
        var cacheKey = $"security:rate-limit:domain:{domain}";
        var lockEntry = _domainCounters.GetOrAdd(cacheKey, _ => new SlidingWindowCounter());

        lock (lockEntry.Sync)
        {
            var current = distributedCache!.GetString(cacheKey);
            var counter = DistributedRateLimitCounter.Parse(current, now);
            var allowed = counter.TryConsume(now, Window, MaxScansPerDomain);
            if (!allowed)
            {
                return false;
            }

            distributedCache!.SetString(
                cacheKey,
                counter.Serialize(),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = Window + TimeSpan.FromMinutes(5)
                });

            return true;
        }
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
        public object Sync { get; } = new();

        public bool TryConsume(DateTimeOffset now, TimeSpan window, int maxRequests)
        {
            lock (Sync)
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
            lock (Sync)
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

    private sealed class DistributedRateLimitCounter(DateTimeOffset windowStart, int count)
    {
        public DateTimeOffset WindowStart { get; private set; } = windowStart;
        public int Count { get; private set; } = count;

        public bool TryConsume(DateTimeOffset now, TimeSpan window, int maxRequests)
        {
            if (now - WindowStart >= window)
            {
                WindowStart = now;
                Count = 0;
            }

            if (Count >= maxRequests)
            {
                return false;
            }

            Count++;
            return true;
        }

        public string Serialize() => $"{WindowStart.UtcTicks}:{Count}";

        public static DistributedRateLimitCounter Parse(string? value, DateTimeOffset now)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return new DistributedRateLimitCounter(now, 0);
            }

            var parts = value.Split(':', 2);
            if (parts.Length != 2 || !long.TryParse(parts[0], out var ticks) || !int.TryParse(parts[1], out var count))
            {
                return new DistributedRateLimitCounter(now, 0);
            }

            return new DistributedRateLimitCounter(new DateTimeOffset(ticks, TimeSpan.Zero), Math.Max(0, count));
        }
    }
}
