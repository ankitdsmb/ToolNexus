using ToolNexus.Infrastructure.Insights;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class InsightProvidersTests
{
    [Fact]
    public void JsonInsightProvider_ErrorInput_ReturnsInsight()
    {
        var provider = new JsonInsightProvider();

        var result = provider.GenerateInsight("format", "name: ada", "invalid", null);

        Assert.NotNull(result);
        Assert.Contains("JSON", result!.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void XmlInsightProvider_MalformedInput_ReturnsInsight()
    {
        var provider = new XmlInsightProvider();

        var result = provider.GenerateInsight("format", "root>", "invalid", null);

        Assert.NotNull(result);
        Assert.Contains("XML", result!.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void SqlInsightProvider_Success_ReturnsFormattingInsight()
    {
        var provider = new SqlInsightProvider();

        var result = provider.GenerateInsight("format", "select * from users", null, null);

        Assert.NotNull(result);
        Assert.Contains("SQL", result!.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RegexInsightProvider_UnclosedGroup_ReturnsSpecificInsight()
    {
        var provider = new RegexInsightProvider();

        var result = provider.GenerateInsight("test", "(abc", "invalid", null);

        Assert.NotNull(result);
        Assert.Contains("group", result!.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void TextDiffInsightProvider_EmptyInput_ReturnsGuidanceInsight()
    {
        var provider = new TextDiffInsightProvider();

        var result = provider.GenerateInsight("compare", string.Empty, null, null);

        Assert.NotNull(result);
        Assert.Contains("No content", result!.Title, StringComparison.OrdinalIgnoreCase);
    }
}
