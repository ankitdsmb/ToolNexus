using System.Net;
using System.Net.Sockets;

namespace ToolNexus.Web.Security;

internal static class IpAddressPolicy
{
    public static bool IsBlocked(IPAddress address)
    {
        if (IPAddress.IsLoopback(address))
        {
            return true;
        }

        return address.AddressFamily switch
        {
            AddressFamily.InterNetwork => IsBlockedIpv4(address),
            AddressFamily.InterNetworkV6 => IsBlockedIpv6(address),
            _ => true
        };
    }

    private static bool IsBlockedIpv4(IPAddress address)
    {
        var bytes = address.GetAddressBytes();

        return bytes[0] switch
        {
            0 => true,
            10 => true,
            100 when bytes[1] >= 64 && bytes[1] <= 127 => true,
            127 => true,
            169 when bytes[1] == 254 => true,
            172 when bytes[1] >= 16 && bytes[1] <= 31 => true,
            192 when bytes[1] == 0 && bytes[2] == 0 => true,
            192 when bytes[1] == 168 => true,
            198 when bytes[1] >= 18 && bytes[1] <= 19 => true,
            _ => false
        };
    }

    private static bool IsBlockedIpv6(IPAddress address)
    {
        if (address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast || address.IsIPv6Teredo)
        {
            return true;
        }

        var bytes = address.GetAddressBytes();

        if (bytes.All(static b => b == 0))
        {
            return true;
        }

        // Unique local addresses (fc00::/7).
        if ((bytes[0] & 0xFE) == 0xFC)
        {
            return true;
        }

        // Documentation range (2001:db8::/32).
        if (bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0D && bytes[3] == 0xB8)
        {
            return true;
        }

        // IPv4-mapped IPv6 addresses.
        if (address.IsIPv4MappedToIPv6)
        {
            var mapped = address.MapToIPv4();
            return IsBlockedIpv4(mapped);
        }

        return false;
    }
}
