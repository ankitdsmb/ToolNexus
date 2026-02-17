using ToolNexus.Domain;

namespace ToolNexus.Domain.UnitTests;

public sealed class ToolResultTests
{
    [Fact]
    [Trait("Category", "Unit")]
    public void Ok_ReturnsExpectedResult()
    {
        var result = ToolResult.Ok("output");
        Assert.True(result.Success);
        Assert.Equal("output", result.Output);
        Assert.Null(result.Error);
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Fail_ReturnsExpectedResult()
    {
        var result = ToolResult.Fail("failure");
        Assert.False(result.Success);
        Assert.Equal(string.Empty, result.Output);
        Assert.Equal("failure", result.Error);
    }
}
