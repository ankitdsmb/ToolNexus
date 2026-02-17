using ToolNexus.Domain;

namespace ToolNexus.Domain.UnitTests;

public sealed class ToolRequestTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [Trait("Category", "Unit")]
    public void Constructor_Throws_WhenActionInvalid(string? action)
    {
        Assert.Throws<ArgumentException>(() => new ToolRequest(action!, "input"));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Constructor_Throws_WhenInputNull()
    {
        Assert.Throws<ArgumentNullException>(() => new ToolRequest("format", null!));
    }

    [Fact]
    [Trait("Category", "Unit")]
    public void Constructor_Creates_WhenValid()
    {
        var options = new Dictionary<string, string> { ["mode"] = "safe" };

        var request = new ToolRequest("format", "{}", options);

        Assert.Equal("format", request.Action);
        Assert.Equal("{}", request.Input);
        Assert.Same(options, request.Options);
    }
}
