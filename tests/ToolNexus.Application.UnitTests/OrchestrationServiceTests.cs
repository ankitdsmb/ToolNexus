using Moq;
using ToolNexus.Application.Services;
using ToolNexus.Domain;

namespace ToolNexus.Application.UnitTests;

public sealed class OrchestrationServiceTests
{
    [Fact, Trait("Category", "Unit")]
    public void SelectToolByCapability_ReturnsNull_ForInvalidTag()
    {
        var sut = new OrchestrationService([]);
        Assert.Null(sut.SelectToolByCapability(" "));
    }

    [Fact, Trait("Category", "Unit")]
    public void SelectToolByCapability_ReturnsMatchingTool_CaseInsensitive()
    {
        var ex = new Mock<IToolExecutor>();
        ex.SetupGet(x => x.Metadata).Returns(new ToolMetadata("n", "d", "c", "e", ["JSON", "format"]));

        var sut = new OrchestrationService([ex.Object]);
        var selected = sut.SelectToolByCapability(" json ");

        Assert.Same(ex.Object, selected);
    }
}
