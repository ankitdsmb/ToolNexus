using System.Net;
using System.Net.Sockets;

namespace ToolNexus.Web.Security;

public interface IPrivateNetworkValidator
{
    Task<bool> IsSafePublicUrlAsync(string url, CancellationToken cancellationToken);
}

public sealed class PrivateNetworkValidator : IPrivateNetworkValidator
{
    private static readonly string[] LocalHostNames = ["localhost"];

    public async Task<bool> IsSafePublicUrlAsync(string url, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(uri.Host))
        {
            return false;
        }

        if (LocalHostNames.Contains(uri.Host, StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        if (IPAddress.TryParse(uri.Host, out var directIp) && IsPrivateOrLoopback(directIp))
        {
            return false;
        }

        IPAddress[] addresses;
        try
        {
            addresses = await Dns.GetHostAddressesAsync(uri.Host, cancellationToken);
        }
        catch
        {
            return false;
        }

        if (addresses.Length == 0)
        {
            return false;
        }

        return addresses.All(address => !IsPrivateOrLoopback(address));
    }

    private static bool IsPrivateOrLoopback(IPAddress address)
    {
        if (IPAddress.IsLoopback(address))
        {
            return true;
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast;
        }

        if (address.AddressFamily != AddressFamily.InterNetwork)
        {
            return true;
        }

        var bytes = address.GetAddressBytes();

        return bytes[0] switch
        {
            10 => true,
            127 => true,
            192 when bytes[1] == 168 => true,
            172 when bytes[1] == 16 => true,
            _ => false
        };
    }
}
