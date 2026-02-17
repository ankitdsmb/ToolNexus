using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;
using ToolNexus.Application.Services;
using ToolNexus.Domain;

namespace ToolNexus.Application.UnitTests;

public sealed class ToolServiceTests
{
    private static ToolService CreateService(
        IEnumerable<IToolExecutor>? executors = null,
        Mock<IToolResultCache>? cacheMock = null,
        ToolResultCacheOptions? options = null)
    {
        return new ToolService(
            executors ?? [],
            (cacheMock ?? new Mock<IToolResultCache>(MockBehavior.Strict)).Object,
            Options.Create(options ?? new ToolResultCacheOptions { AbsoluteExpirationSeconds = 30 }),
            NullLogger<ToolService>.Instance);
    }

    [Fact, Trait("Category", "Unit")]
    public async Task ExecuteAsync_ReturnsError_WhenRequestNull()
    {
        var service = CreateService();
        var response = await service.ExecuteAsync(null!);
        Assert.False(response.Success);
        Assert.Equal("Request is required.", response.Error);
    }

    [Theory, Trait("Category", "Unit")]
    [InlineData(null, "run", "input", "Tool slug is required.")]
    [InlineData("slug", null, "input", "Action is required.")]
    [InlineData("slug", "run", null, "Input is required.")]
    public async Task ExecuteAsync_ReturnsValidationError_ForInvalidInput(string? slug, string? action, string? input, string error)
    {
        var service = CreateService();
        var response = await service.ExecuteAsync(new ToolExecutionRequest(slug!, action!, input!));
        Assert.False(response.Success);
        Assert.Equal(error, response.Error);
    }

    [Fact, Trait("Category", "Unit")]
    public async Task ExecuteAsync_ReturnsNotFound_WhenSlugUnknown()
    {
        var service = CreateService();
        var response = await service.ExecuteAsync(new ToolExecutionRequest("missing", "run", "x"));
        Assert.True(response.NotFound);
        Assert.False(response.Success);
    }

    [Fact, Trait("Category", "Unit")]
    public async Task ExecuteAsync_ReturnsCachedResult_OnCacheHit()
    {
        var executor = new Mock<IToolExecutor>();
        executor.SetupGet(x => x.Slug).Returns("json");
        var cache = new Mock<IToolResultCache>();
        cache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ToolResultCacheItem(true, "cached", null));

        var service = CreateService([executor.Object], cache);
        var response = await service.ExecuteAsync(new ToolExecutionRequest("json", "format", "{}"));

        Assert.True(response.Success);
        Assert.Equal("cached", response.Output);
        executor.Verify(x => x.ExecuteAsync(It.IsAny<ToolRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact, Trait("Category", "Unit")]
    public async Task ExecuteAsync_ExecutesAndCaches_OnCacheMiss_WithHashKeyConsistency()
    {
        var executor = new Mock<IToolExecutor>();
        executor.SetupGet(x => x.Slug).Returns("json");
        executor.Setup(x => x.ExecuteAsync(It.IsAny<ToolRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ToolResult.Ok("ok"));

        string? seenKey = null;
        var cache = new Mock<IToolResultCache>();
        cache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((ToolResultCacheItem?)null);
        cache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<ToolResultCacheItem>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .Callback<string, ToolResultCacheItem, TimeSpan, CancellationToken>((key, _, _, _) => seenKey = key)
            .Returns(Task.CompletedTask);

        var service = CreateService([executor.Object], cache, new ToolResultCacheOptions { AbsoluteExpirationSeconds = -2 });
        var response = await service.ExecuteAsync(new ToolExecutionRequest(" Json ", " Format ", "{" + new string('a', 5000) + "}"));

        Assert.True(response.Success);
        Assert.NotNull(seenKey);
        Assert.StartsWith("json:format:", seenKey, StringComparison.Ordinal);
        Assert.Equal(76, seenKey!.Length);
    }

    [Fact, Trait("Category", "Unit")]
    public async Task ExecuteAsync_ReturnsFailure_OnExecutorException()
    {
        var executor = new Mock<IToolExecutor>();
        executor.SetupGet(x => x.Slug).Returns("json");
        executor.Setup(x => x.ExecuteAsync(It.IsAny<ToolRequest>(), It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("boom"));
        var cache = new Mock<IToolResultCache>();
        cache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((ToolResultCacheItem?)null);

        var service = CreateService([executor.Object], cache);
        var response = await service.ExecuteAsync(new ToolExecutionRequest("json", "format", "{}"));

        Assert.False(response.Success);
        Assert.Equal("Tool execution failed unexpectedly.", response.Error);
    }

    [Fact, Trait("Category", "Unit")]
    public async Task ExecuteAsync_DoesNotCache_OnToolFailure()
    {
        var executor = new Mock<IToolExecutor>();
        executor.SetupGet(x => x.Slug).Returns("json");
        executor.Setup(x => x.ExecuteAsync(It.IsAny<ToolRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ToolResult.Fail("bad input"));
        var cache = new Mock<IToolResultCache>();
        cache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((ToolResultCacheItem?)null);

        var service = CreateService([executor.Object], cache);
        var response = await service.ExecuteAsync(new ToolExecutionRequest("json", "format", string.Empty));

        Assert.False(response.Success);
        Assert.Equal("bad input", response.Error);
        cache.Verify(x => x.SetAsync(It.IsAny<string>(), It.IsAny<ToolResultCacheItem>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact, Trait("Category", "Unit")]
    public async Task ExecuteAsync_SwallowsCacheReadAndWriteExceptions()
    {
        var executor = new Mock<IToolExecutor>();
        executor.SetupGet(x => x.Slug).Returns("json");
        executor.Setup(x => x.ExecuteAsync(It.IsAny<ToolRequest>(), It.IsAny<CancellationToken>())).ReturnsAsync(ToolResult.Ok("x"));

        var cache = new Mock<IToolResultCache>();
        cache.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ThrowsAsync(new Exception("cache down"));
        cache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<ToolResultCacheItem>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>())).ThrowsAsync(new Exception("cache write down"));

        var service = CreateService([executor.Object], cache);
        var response = await service.ExecuteAsync(new ToolExecutionRequest("json", "format", "{}"));

        Assert.True(response.Success);
    }
}
