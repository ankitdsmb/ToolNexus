using System.Net;
using System.Net.Sockets;

namespace ToolNexus.Web.Security;

public sealed class UrlSecurityValidator
{
    public string ValidateAndNormalize(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || !Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            throw new ArgumentException("Invalid URL.");
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("Only http and https URLs are allowed.");
        }

        if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Localhost URLs are not allowed.");
        }

        if (IPAddress.TryParse(uri.Host, out var parsedIp) && IsPrivateOrLoopback(parsedIp))
        {
            throw new InvalidOperationException("Private or loopback IPs are not allowed.");
        }

        var resolvedIps = Dns.GetHostAddresses(uri.Host);
        if (resolvedIps.Any(IsPrivateOrLoopback))
        {
            throw new InvalidOperationException("Resolved host points to private or loopback IPs.");
        }

        return uri.ToString();
    }

    private static bool IsPrivateOrLoopback(IPAddress address)
    {
        if (IPAddress.IsLoopback(address))
        {
            return true;
        }

        if (address.AddressFamily != AddressFamily.InterNetwork)
        {
            return false;
        }

        var bytes = address.GetAddressBytes();
        return bytes[0] == 10
               || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
               || (bytes[0] == 192 && bytes[1] == 168)
               || (bytes[0] == 127);
    }
}
