using ToolNexus.Domain;
using ToolNexus.Infrastructure.Executors;

namespace ToolNexus.Tools.Json.Tests;

public sealed class JsonToolExecutorTests
{
    private readonly JsonToolExecutor _executor = new();

    [Fact]
    public async Task Format_ReturnsIndentedJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("format", "{\"a\":1}"));

        Assert.True(result.Success);
        Assert.Contains("\n", result.Output);
    }

    [Fact]
    public async Task Validate_ReturnsValidMessage()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("validate", "{\"x\":true}"));

        Assert.True(result.Success);
        Assert.Equal("Valid JSON", result.Output);
    }

    [Fact]
    public async Task ToCsv_ReturnsCsvContent()
    {
        var input = "[{\"name\":\"Ada\",\"role\":\"Engineer\"}]";
        var result = await _executor.ExecuteAsync(new ToolRequest("to-csv", input));

        Assert.True(result.Success);
        Assert.Contains("name", result.Output);
        Assert.Contains("Ada", result.Output);
    }
}
