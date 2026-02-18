using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public class Base64ToolExecutorTests
{
    private readonly Base64ToolExecutor _executor = new();

    [Fact]
    public async Task Decode_WithInvalidBase64Input_ShouldReturnFriendlyErrorMessage()
    {
        // Arrange
        var request = new ToolRequest("decode", "Invalid Base64 Input!@#");

        // Act
        var result = await _executor.ExecuteAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("Invalid Base64 input", result.Error);
    }

    [Fact]
    public async Task Encode_WithValidInput_ShouldReturnBase64String()
    {
        // Arrange
        var input = "Hello World";
        var expected = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(input));
        var request = new ToolRequest("encode", input);

        // Act
        var result = await _executor.ExecuteAsync(request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(expected, result.Output);
    }

    [Fact]
    public async Task Decode_WithValidBase64Input_ShouldReturnString()
    {
        // Arrange
        var input = "Hello World";
        var encoded = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(input));
        var request = new ToolRequest("decode", encoded);

        // Act
        var result = await _executor.ExecuteAsync(request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(input, result.Output);
    }
}
