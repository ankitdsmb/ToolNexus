using System.Net;
using System.Net.Sockets;

namespace ToolNexus.Web.Security;

public sealed class PinnedHttpFetcher(IPrivateNetworkValidator privateNetworkValidator)
{
    private const int MaxRedirects = 5;

    public async Task<string> GetStringAsync(Uri targetUri, IPAddress pinnedAddress, CancellationToken cancellationToken)
    {
        if (!IsAllowedScheme(targetUri))
        {
            throw new InvalidOperationException("Only http and https URLs are allowed.");
        }

        var currentUri = targetUri;
        var currentPinnedAddress = pinnedAddress;

        for (var redirectCount = 0; redirectCount <= MaxRedirects; redirectCount++)
        {
            using var client = CreatePinnedClient(currentUri, currentPinnedAddress);
            using var response = await client.GetAsync(currentUri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            if (IsRedirect(response.StatusCode) && response.Headers.Location is not null)
            {
                if (redirectCount == MaxRedirects)
                {
                    throw new InvalidOperationException("Redirect limit exceeded.");
                }

                var redirectTarget = response.Headers.Location.IsAbsoluteUri
                    ? response.Headers.Location
                    : new Uri(currentUri, response.Headers.Location);

                if (!IsAllowedScheme(redirectTarget))
                {
                    throw new InvalidOperationException("Redirect target must use http/https.");
                }

                var validatedRedirectAddress = await privateNetworkValidator.ResolveValidatedAddressAsync(redirectTarget.Host, cancellationToken);
                if (validatedRedirectAddress is null)
                {
                    throw new InvalidOperationException($"Blocked redirect target '{redirectTarget}'.");
                }

                currentUri = redirectTarget;
                currentPinnedAddress = validatedRedirectAddress;
                continue;
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync(cancellationToken);
        }

        throw new InvalidOperationException("Redirect loop detected.");
    }

    private static HttpClient CreatePinnedClient(Uri targetUri, IPAddress pinnedAddress)
    {
        var handler = new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseProxy = false,
            ConnectCallback = async (context, cancellationToken) =>
            {
                var socket = new Socket(pinnedAddress.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
                try
                {
                    await socket.ConnectAsync(new IPEndPoint(pinnedAddress, context.DnsEndPoint.Port), cancellationToken);
                    return new NetworkStream(socket, ownsSocket: true);
                }
                catch
                {
                    socket.Dispose();
                    throw;
                }
            }
        };

        var client = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(30)
        };

        client.DefaultRequestHeaders.Host = targetUri.IsDefaultPort
            ? targetUri.Host
            : $"{targetUri.Host}:{targetUri.Port}";

        return client;
    }

    private static bool IsAllowedScheme(Uri uri)
        => uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);

    private static bool IsRedirect(HttpStatusCode statusCode)
        => statusCode is HttpStatusCode.Moved
            or HttpStatusCode.Redirect
            or HttpStatusCode.RedirectMethod
            or HttpStatusCode.TemporaryRedirect
            or HttpStatusCode.PermanentRedirect;
}
