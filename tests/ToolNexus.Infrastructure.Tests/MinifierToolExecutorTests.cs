using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public class MinifierToolExecutorTests
{
    private readonly MinifierToolExecutor _executor = new();

    [Fact]
    public async Task ExecuteAsync_Minify_ReturnsMinifiedCss()
    {
        var input = "body { color: #ffffff; }";
        var expected = "body{color:#fff}";
        var request = new ToolRequest("minify", input, new Dictionary<string, string>());

        var result = await _executor.ExecuteAsync(request, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(expected, result.Output);
    }

    [Fact]
    public async Task ExecuteAsync_Format_ReturnsFormattedCss()
    {
        var input = "body{color:#fff}";
        var request = new ToolRequest("format", input, new Dictionary<string, string>());

        var result = await _executor.ExecuteAsync(request, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Contains("\n", result.Output);
        Assert.Contains("body", result.Output);
    }

    [Fact]
    public async Task ExecuteAsync_InvalidCss_ReturnsError()
    {
        var input = "body { color: ";
        var request = new ToolRequest("minify", input, new Dictionary<string, string>());

        var result = await _executor.ExecuteAsync(request, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Contains("CSS parsing failed", result.Error);
    }
}
