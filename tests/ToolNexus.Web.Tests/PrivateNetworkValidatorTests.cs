using ToolNexus.Web.Security;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class PrivateNetworkValidatorTests
{
    private readonly PrivateNetworkValidator _validator = new();

    [Theory]
    [InlineData("http://172.16.0.10")]
    [InlineData("http://172.20.10.5")]
    [InlineData("http://172.31.255.250")]
    public async Task IsSafePublicUrlAsync_BlocksEntire172_16To31Range(string url)
    {
        var safe = await _validator.IsSafePublicUrlAsync(url, CancellationToken.None);
        Assert.False(safe);
    }

    [Theory]
    [InlineData("http://[::1]")]
    [InlineData("http://[fe80::1]")]
    [InlineData("http://[fc00::abcd]")]
    public async Task IsSafePublicUrlAsync_BlocksIpv6LocalLinkLocalAndUniqueLocal(string url)
    {
        var safe = await _validator.IsSafePublicUrlAsync(url, CancellationToken.None);
        Assert.False(safe);
    }

    [Theory]
    [InlineData("http://172.15.255.255")]
    [InlineData("http://172.32.0.1")]
    [InlineData("https://8.8.8.8")]
    [InlineData("https://[2606:4700:4700::1111]")]
    public async Task IsSafePublicUrlAsync_AllowsPublicAddresses(string url)
    {
        var safe = await _validator.IsSafePublicUrlAsync(url, CancellationToken.None);
        Assert.True(safe);
    }
}
