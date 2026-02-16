using ToolNexus.Tools.Common;
using ToolNexus.Tools.Json;

namespace ToolNexus.Tools.Json.Tests;

public sealed class JsonToolExecutorTests
{
    private readonly JsonToolExecutor _executor = new();

    [Fact]
    public async Task Format_ReturnsIndentedJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("{\"a\":1}", new Dictionary<string, string> { ["action"] = "format" }));

        Assert.True(result.Success);
        Assert.Contains("\n", result.Output);
    }

    [Fact]
    public async Task Validate_ReturnsValidMessage()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("{\"x\":true}", new Dictionary<string, string> { ["action"] = "validate" }));

        Assert.True(result.Success);
        Assert.Equal("Valid JSON", result.Output);
    }

    [Fact]
    public async Task ToCsv_ReturnsCsvContent()
    {
        var input = "[{\"name\":\"Ada\",\"role\":\"Engineer\"}]";
        var result = await _executor.ExecuteAsync(new ToolRequest(input, new Dictionary<string, string> { ["action"] = "to-csv" }));

        Assert.True(result.Success);
        Assert.Contains("name", result.Output);
        Assert.Contains("Ada", result.Output);
    }

    [Fact]
    public async Task UnsupportedAction_ReturnsFailedResult()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("{}", new Dictionary<string, string> { ["action"] = "unknown" }));

        Assert.False(result.Success);
        Assert.Contains("not supported", result.Error);
    }

    [Fact]
    public async Task InvalidJson_ReturnsFailedResult()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("{invalid json}", new Dictionary<string, string> { ["action"] = "format" }));

        Assert.False(result.Success);
        Assert.False(string.IsNullOrWhiteSpace(result.Error));
    }
}
