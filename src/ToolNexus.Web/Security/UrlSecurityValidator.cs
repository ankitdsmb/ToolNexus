using System.Net;

namespace ToolNexus.Web.Security;

public sealed class UrlSecurityValidator(IPrivateNetworkValidator privateNetworkValidator)
{
    public string ValidateAndNormalize(string? url)
        => ValidateAndNormalizeAsync(url, CancellationToken.None).GetAwaiter().GetResult();

    public async Task<string> ValidateAndNormalizeAsync(string? url, CancellationToken cancellationToken)
        => (await ValidateAndPinAsync(url, cancellationToken)).NormalizedUrl;

    public async Task<ValidatedUrl> ValidateAndPinAsync(string? url, CancellationToken cancellationToken)
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

        if (IPAddress.TryParse(uri.Host, out var parsedIp) && IpAddressPolicy.IsBlocked(parsedIp))
        {
            throw new InvalidOperationException("Loopback, link-local, and private IPs are not allowed.");
        }

        var pinnedAddress = await privateNetworkValidator.ResolveValidatedAddressAsync(uri.Host, cancellationToken);
        if (pinnedAddress is null)
        {
            throw new InvalidOperationException("Resolved host points to loopback, link-local, or private IPs.");
        }

        return new ValidatedUrl(uri.ToString(), pinnedAddress);
    }
}

public sealed record ValidatedUrl(string NormalizedUrl, IPAddress PinnedAddress);
