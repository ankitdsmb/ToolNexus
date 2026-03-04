using ToolNexus.Web.Security;
using Xunit;
using System.Net;

namespace ToolNexus.Web.Tests;

public sealed class UrlSecurityValidatorTests
{
    private readonly UrlSecurityValidator _validator = new(new PrivateNetworkValidator());

    [Theory]
    [InlineData("http://127.0.0.1")]
    [InlineData("http://10.10.10.10")]
    [InlineData("http://172.16.0.1")]
    [InlineData("http://172.31.255.255")]
    [InlineData("http://192.168.1.50")]
    [InlineData("http://169.254.10.20")]
    [InlineData("http://[::1]")]
    [InlineData("http://[fe80::1]")]
    [InlineData("http://[fc00::1]")]
    public async Task ValidateAndNormalizeAsync_BlocksPrivateLoopbackAndLinkLocalAddresses(string url)
    {
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => _validator.ValidateAndNormalizeAsync(url, CancellationToken.None));
        Assert.Contains("not allowed", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("http://172.32.0.1")]
    [InlineData("http://8.8.8.8")]
    [InlineData("https://1.1.1.1")]
    [InlineData("https://[2606:4700:4700::1111]")]
    public async Task ValidateAndNormalizeAsync_AllowsPublicAddresses(string url)
    {
        var normalized = await _validator.ValidateAndNormalizeAsync(url, CancellationToken.None);
        Assert.Equal(new Uri(url).ToString(), normalized);
    }
}

public sealed class UrlSecurityValidatorPinningTests
{
    [Fact]
    public async Task ValidateAndPinAsync_ReturnsPinnedAddress()
    {
        var validator = new UrlSecurityValidator(new StubPrivateNetworkValidator(IPAddress.Parse("93.184.216.34")));

        var result = await validator.ValidateAndPinAsync("https://example.com/path", CancellationToken.None);

        Assert.Equal("https://example.com/path", result.NormalizedUrl);
        Assert.Equal(IPAddress.Parse("93.184.216.34"), result.PinnedAddress);
    }

    private sealed class StubPrivateNetworkValidator(IPAddress pinned) : IPrivateNetworkValidator
    {
        public Task<bool> IsSafePublicUrlAsync(string url, CancellationToken cancellationToken) => Task.FromResult(true);

        public Task<IPAddress?> ResolveValidatedAddressAsync(string host, CancellationToken cancellationToken)
            => Task.FromResult<IPAddress?>(pinned);
    }
}
