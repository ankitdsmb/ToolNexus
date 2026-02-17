using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;
using Xunit;

namespace ToolNexus.Tools.Json.Tests;

public sealed class JsonValidatorToolExecutorTests
{
    private readonly JsonValidatorToolExecutor _executor = new();

    [Fact]
    public async Task Validate_ReturnsValidMessage_ForValidJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("validate", "{\"valid\":true}"));

        Assert.True(result.Success);
        Assert.Equal("Valid JSON", result.Output);
    }

    [Fact]
    public async Task Validate_ReturnsFailure_ForInvalidJson()
    {
        var result = await _executor.ExecuteAsync(new ToolRequest("validate", "{\"valid\":"));

        Assert.False(result.Success);
        Assert.Contains("json", result.Error, StringComparison.OrdinalIgnoreCase);
    }
}
