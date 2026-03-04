using System.Collections.Concurrent;

namespace ToolNexus.Web.Security;

public interface IBlockedIpService
{
    bool IsBlocked(string ipAddress);
    void Block(string ipAddress, TimeSpan duration, string reason);
}

public sealed class BlockedIpService : IBlockedIpService
{
    private readonly ConcurrentDictionary<string, BlockEntry> _blockedIps = new(StringComparer.Ordinal);

    public bool IsBlocked(string ipAddress)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            return true;
        }

        var now = DateTimeOffset.UtcNow;
        if (!_blockedIps.TryGetValue(ipAddress, out var entry))
        {
            return false;
        }

        if (entry.BlockedUntilUtc > now)
        {
            return true;
        }

        _blockedIps.TryRemove(ipAddress, out _);
        return false;
    }

    public void Block(string ipAddress, TimeSpan duration, string reason)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            return;
        }

        _blockedIps[ipAddress] = new BlockEntry(DateTimeOffset.UtcNow.Add(duration), reason);
    }

    private sealed record BlockEntry(DateTimeOffset BlockedUntilUtc, string Reason);
}
