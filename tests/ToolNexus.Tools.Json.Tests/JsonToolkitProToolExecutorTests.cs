using System.Text.Json;
using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;
using Xunit;

namespace ToolNexus.Tools.Json.Tests;

public sealed class JsonToolkitProToolExecutorTests
{
    private readonly JsonToolkitProToolExecutor _executor = new();

    [Fact]
    public async Task Execute_Normalize_MinifiesJsonDeterministically()
    {
        var input = """
                    {
                      "operation": "normalize",
                      "json": "{  \"a\" : 1, \"b\": [ true, false ] }"
                    }
                    """;

        var result = await _executor.ExecuteAsync(new ToolRequest("execute", input));

        Assert.True(result.Success);
        using var document = JsonDocument.Parse(result.Output);
        Assert.Equal("normalize", document.RootElement.GetProperty("operation").GetString());
        Assert.Equal("{\"a\":1,\"b\":[true,false]}", document.RootElement.GetProperty("normalizedJson").GetString());
    }

    [Fact]
    public async Task Execute_Pretty_ReturnsConsistentIndentedOutput()
    {
        var input = """
                    {
                      "operation": "pretty",
                      "json": "{\"b\":2,\"a\":1}"
                    }
                    """;

        var result = await _executor.ExecuteAsync(new ToolRequest("execute", input));

        Assert.True(result.Success);
        using var document = JsonDocument.Parse(result.Output);
        var prettyJson = document.RootElement.GetProperty("prettyJson").GetString();
        Assert.NotNull(prettyJson);
        Assert.Contains("\n  \"b\": 2,", prettyJson);
        Assert.Contains("\n  \"a\": 1\n", prettyJson);
    }

    [Fact]
    public async Task Execute_Analyze_ReturnsExpectedMetrics()
    {
        var input = """
                    {
                      "operation": "analyze",
                      "json": "{\"user\":{\"name\":\"Ada\",\"roles\":[\"admin\",\"editor\"]},\"active\":true}"
                    }
                    """;

        var result = await _executor.ExecuteAsync(new ToolRequest("execute", input));

        Assert.True(result.Success);
        using var document = JsonDocument.Parse(result.Output);
        Assert.Equal(4, document.RootElement.GetProperty("propertyCount").GetInt32());
        Assert.Equal(4, document.RootElement.GetProperty("nestingDepth").GetInt32());
        Assert.Equal(1, document.RootElement.GetProperty("arrayCount").GetInt32());
        Assert.Equal(2, document.RootElement.GetProperty("objectCount").GetInt32());
    }

    [Fact]
    public async Task Execute_InvalidJson_ReturnsFailure()
    {
        var input = """
                    {
                      "operation": "normalize",
                      "json": "{\"broken\":"
                    }
                    """;

        var result = await _executor.ExecuteAsync(new ToolRequest("execute", input));

        Assert.False(result.Success);
        Assert.Contains("Invalid JSON input", result.Error, StringComparison.OrdinalIgnoreCase);
    }
}
