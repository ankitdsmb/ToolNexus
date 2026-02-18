using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;
using Xunit;

namespace ToolNexus.Tools.Json.Tests;

public class JsonToolExecutorInvalidInputTests
{
    private readonly JsonToolExecutor _executor = new();

    [Fact]
    public async Task Format_ReturnsFailure_WhenInputIsInvalidJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("format", "{invalid:json}"));

        Assert.False(result.Success, "Expected failure for invalid JSON input.");
        Assert.NotNull(result.Error);
        Assert.NotEmpty(result.Error);
    }

    [Fact]
    public async Task Minify_ReturnsFailure_WhenInputIsInvalidJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("minify", "{invalid:json}"));

        Assert.False(result.Success, "Expected failure for invalid JSON input.");
        Assert.NotNull(result.Error);
        Assert.NotEmpty(result.Error);
    }

    [Fact]
    public async Task Validate_ReturnsFailure_WhenInputIsInvalidJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("validate", "{invalid:json}"));

        Assert.False(result.Success, "Expected failure for invalid JSON input.");
        Assert.NotNull(result.Error);
        Assert.NotEmpty(result.Error);
    }

    [Fact]
    public async Task ToCsv_ReturnsFailure_WhenInputIsInvalidJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("to-csv", "{invalid:json}"));

        Assert.False(result.Success, "Expected failure for invalid JSON input.");
        Assert.NotNull(result.Error);
        Assert.NotEmpty(result.Error);
    }

    [Fact]
    public async Task ToCsv_ReturnsFailure_WhenInputIsNotObjectOrArray()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("to-csv", "\"just a string\""));

        Assert.False(result.Success, "Expected failure for non-object/array JSON input.");
        Assert.Contains("must be an object or array", result.Error);
    }
}
