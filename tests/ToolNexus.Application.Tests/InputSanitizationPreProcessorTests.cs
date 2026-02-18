using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public class InputSanitizationPreProcessorTests
{
    private readonly ToolNexus.Application.Options.InputSanitizationOptions _defaultOptions = new()
    {
        MaxInputCharacters = 100,
        RejectControlCharacters = true
    };

    [Fact]
    public async Task ProcessAsync_NullRequest_ThrowsArgumentNullException()
    {
        var processor = CreateProcessor();
        await Assert.ThrowsAsync<ArgumentNullException>(() => processor.ProcessAsync(null!).AsTask());
    }

    [Fact]
    public async Task ProcessAsync_InputExceedsMaxLength_ThrowsInputSanitizationException()
    {
        var options = new ToolNexus.Application.Options.InputSanitizationOptions { MaxInputCharacters = 5 };
        var processor = CreateProcessor(options);
        var request = new ToolExecutionRequest("slug", "action", "123456");

        var ex = await Assert.ThrowsAsync<InputSanitizationException>(() => processor.ProcessAsync(request).AsTask());
        Assert.Equal("Input exceeds the maximum allowed payload size.", ex.Message);
    }

    [Fact]
    public async Task ProcessAsync_InvalidUnicode_ThrowsInputSanitizationException()
    {
        var processor = CreateProcessor();
        // Unpaired high surrogate
        var request = new ToolExecutionRequest("slug", "action", "\uD800");

        var ex = await Assert.ThrowsAsync<InputSanitizationException>(() => processor.ProcessAsync(request).AsTask());
        Assert.Equal("Input contains invalid UTF sequences.", ex.Message);
    }

    [Fact]
    public async Task ProcessAsync_ControlCharacters_Stripped()
    {
        var processor = CreateProcessor();
        // \u0007 is Bell, \u001B is Escape
        var input = "Hello\u0007World\u001B";
        var request = new ToolExecutionRequest("slug", "action", input);

        var result = await processor.ProcessAsync(request);

        Assert.Equal("HelloWorld", result.Input);
    }

    [Fact]
    public async Task ProcessAsync_AllowedControlCharacters_NotStripped()
    {
        var processor = CreateProcessor();
        var input = "Line1\nLine2\r\tTabbed";
        var request = new ToolExecutionRequest("slug", "action", input);

        var result = await processor.ProcessAsync(request);

        Assert.Equal(input, result.Input);
        // Ensure it's the same instance if no changes (optimization check)
        Assert.Same(request, result);
    }

    [Fact]
    public async Task ProcessAsync_NullByte_AlwaysStripped()
    {
        var options = new ToolNexus.Application.Options.InputSanitizationOptions { RejectControlCharacters = false };
        var processor = CreateProcessor(options);
        var input = "Null\0Byte";
        var request = new ToolExecutionRequest("slug", "action", input);

        var result = await processor.ProcessAsync(request);

        Assert.Equal("NullByte", result.Input);
    }

    [Fact]
    public async Task ProcessAsync_RejectControlCharactersFalse_DoesNotStripOtherControlChars()
    {
         var options = new ToolNexus.Application.Options.InputSanitizationOptions { RejectControlCharacters = false };
        var processor = CreateProcessor(options);
        // \u0007 is Bell
        var input = "Hello\u0007World";
        var request = new ToolExecutionRequest("slug", "action", input);

        var result = await processor.ProcessAsync(request);

        Assert.Equal(input, result.Input);
    }

    private InputSanitizationPreProcessor CreateProcessor(ToolNexus.Application.Options.InputSanitizationOptions? options = null)
    {
        var opts = Microsoft.Extensions.Options.Options.Create(options ?? _defaultOptions);
        return new InputSanitizationPreProcessor(opts, NullLogger<InputSanitizationPreProcessor>.Instance);
    }
}
