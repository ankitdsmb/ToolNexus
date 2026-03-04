using System.Net;

namespace ToolNexus.Web.Security;

public interface IPrivateNetworkValidator
{
    Task<bool> IsSafePublicUrlAsync(string url, CancellationToken cancellationToken);
    Task<IPAddress?> ResolveValidatedAddressAsync(string host, CancellationToken cancellationToken);
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

        if (string.IsNullOrWhiteSpace(uri.Host) || LocalHostNames.Contains(uri.Host, StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        if (IPAddress.TryParse(uri.Host, out var directIp))
        {
            return !IpAddressPolicy.IsBlocked(directIp);
        }

        var resolved = await ResolveValidatedAddressAsync(uri.Host, cancellationToken);
        return resolved is not null;
    }

    public async Task<IPAddress?> ResolveValidatedAddressAsync(string host, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(host) || LocalHostNames.Contains(host, StringComparer.OrdinalIgnoreCase))
        {
            return null;
        }

        IPAddress[] addresses;
        try
        {
            addresses = await Dns.GetHostAddressesAsync(host, cancellationToken);
        }
        catch
        {
            return null;
        }

        if (addresses.Length == 0)
        {
            return null;
        }

        if (addresses.Any(IpAddressPolicy.IsBlocked))
        {
            return null;
        }

        return addresses[0];
    }
}
