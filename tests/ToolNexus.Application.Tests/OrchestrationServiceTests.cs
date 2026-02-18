using ToolNexus.Application.Abstractions;
using ToolNexus.Application.Services;
using Xunit;

namespace ToolNexus.Application.Tests;

public sealed class OrchestrationServiceTests
{
    private sealed class StubToolExecutor : IToolExecutor
    {
        public StubToolExecutor(string slug, params string[] capabilityTags)
        {
            Slug = slug;
            Metadata = new ToolMetadata(
                Name: slug,
                Description: "A stub tool executor",
                Category: "Testing",
                ExampleInput: "{}",
                CapabilityTags: capabilityTags
            );
        }

        public string Slug { get; }

        public ToolMetadata Metadata { get; }

        public IReadOnlyCollection<string> SupportedActions => [];

        public Task<ToolResult> ExecuteAsync(ToolRequest request, CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }
    }

    [Fact]
    public void SelectToolByCapability_ReturnsNull_WhenCapabilityTagIsWhitespace()
    {
        var service = new OrchestrationService([]);
        var result = service.SelectToolByCapability("   ");
        Assert.Null(result);
    }

    [Fact]
    public void SelectToolByCapability_ReturnsNull_WhenCapabilityTagIsNull()
    {
        var service = new OrchestrationService([]);
        var result = service.SelectToolByCapability(null!);
        Assert.Null(result);
    }

    [Fact]
    public void SelectToolByCapability_ReturnsMatchingTool_WhenCapabilityTagMatchesExactly()
    {
        var executor = new StubToolExecutor("json-tool", "json-formatting");
        var service = new OrchestrationService([executor]);

        var result = service.SelectToolByCapability("json-formatting");

        Assert.NotNull(result);
        Assert.Equal(executor.Slug, result!.Slug);
    }

    [Fact]
    public void SelectToolByCapability_ReturnsMatchingTool_WhenCapabilityTagMatchesCaseInsensitive()
    {
        var executor = new StubToolExecutor("json-tool", "json-formatting");
        var service = new OrchestrationService([executor]);

        var result = service.SelectToolByCapability("JSON-FORMATTING");

        Assert.NotNull(result);
        Assert.Equal(executor.Slug, result!.Slug);
    }

    [Fact]
    public void SelectToolByCapability_ReturnsNull_WhenNoToolMatchesCapabilityTag()
    {
        var executor = new StubToolExecutor("json-tool", "json-formatting");
        var service = new OrchestrationService([executor]);

        var result = service.SelectToolByCapability("xml-formatting");

        Assert.Null(result);
    }

    [Fact]
    public void SelectToolByCapability_ReturnsFirstMatchingTool_WhenMultipleToolsMatch()
    {
        var executor1 = new StubToolExecutor("json-tool-1", "json-formatting");
        var executor2 = new StubToolExecutor("json-tool-2", "json-formatting");
        var service = new OrchestrationService([executor1, executor2]);

        var result = service.SelectToolByCapability("json-formatting");

        Assert.NotNull(result);
        Assert.Equal(executor1.Slug, result!.Slug);
    }
}
