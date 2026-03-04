using System.Net;
using System.Net.Sockets;
using System.Text;
using ToolNexus.Web.Security;

namespace ToolNexus.Web.Tests;

public sealed class PinnedHttpFetcherTests
{
    [Fact]
    public async Task GetStringAsync_UsesPinnedIpAndPreservesHostHeader()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();

        var serverTask = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync();
            using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);
            using var writer = new StreamWriter(stream, Encoding.ASCII, leaveOpen: true) { NewLine = "\r\n", AutoFlush = true };

            string? line;
            string? hostHeader = null;
            while (!string.IsNullOrEmpty(line = await reader.ReadLineAsync()))
            {
                if (line.StartsWith("Host:", StringComparison.OrdinalIgnoreCase))
                {
                    hostHeader = line[5..].Trim();
                }
            }

            await writer.WriteAsync("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK");
            return hostHeader;
        });

        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        var fetcher = new PinnedHttpFetcher(new TestPrivateNetworkValidator());

        var response = await fetcher.GetStringAsync(new Uri($"http://public.example:{port}/styles.css"), IPAddress.Loopback, CancellationToken.None);

        Assert.Equal("OK", response);
        Assert.Equal($"public.example:{port}", await serverTask);
    }

    [Fact]
    public async Task GetStringAsync_RejectsRedirectWhenTargetValidationFails()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();

        var serverTask = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync();
            using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);
            using var writer = new StreamWriter(stream, Encoding.ASCII, leaveOpen: true) { NewLine = "\r\n", AutoFlush = true };

            while (!string.IsNullOrEmpty(await reader.ReadLineAsync()))
            {
            }

            await writer.WriteAsync("HTTP/1.1 302 Found\r\nLocation: http://blocked.example/\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
        });

        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        var fetcher = new PinnedHttpFetcher(new TestPrivateNetworkValidator(blockedHosts: ["blocked.example"]));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            fetcher.GetStringAsync(new Uri($"http://public.example:{port}/"), IPAddress.Loopback, CancellationToken.None));

        Assert.Contains("Blocked redirect target", ex.Message, StringComparison.Ordinal);
        await serverTask;
    }

    private sealed class TestPrivateNetworkValidator(string[]? blockedHosts = null) : IPrivateNetworkValidator
    {
        private readonly HashSet<string> _blockedHosts = new(blockedHosts ?? [], StringComparer.OrdinalIgnoreCase);

        public Task<bool> IsSafePublicUrlAsync(string url, CancellationToken cancellationToken) => Task.FromResult(true);

        public Task<IPAddress?> ResolveValidatedAddressAsync(string host, CancellationToken cancellationToken)
        {
            if (_blockedHosts.Contains(host))
            {
                return Task.FromResult<IPAddress?>(null);
            }

            return Task.FromResult<IPAddress?>(IPAddress.Loopback);
        }
    }
}
