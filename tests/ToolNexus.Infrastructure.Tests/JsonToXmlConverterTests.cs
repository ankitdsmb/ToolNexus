using ToolNexus.Application.Abstractions;
using ToolNexus.Infrastructure.Executors;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class JsonToXmlConverterTests
{
    private readonly ManifestMappedToolExecutor _executor = new("json-to-xml");

    [Fact]
    public async Task Convert_Renders_Array_As_Item_Elements()
    {
        var input = """
            {"users":[{"name":"John"},{"name":"Ana"}]}
            """;

        var result = await _executor.ExecuteAsync(new ToolRequest("convert", input));

        Assert.True(result.Success);
        Assert.Contains("<users>", result.Output);
        Assert.Contains("<item>", result.Output);
        Assert.Contains("<name>John</name>", result.Output);
    }

    [Fact]
    public async Task Convert_Escapes_Xml_Special_Characters()
    {
        var input = """
            {"danger":"A&B <tag> \"quoted\""}
            """;

        var result = await _executor.ExecuteAsync(new ToolRequest("convert", input));

        Assert.True(result.Success);
        Assert.Contains("A&amp;B &lt;tag&gt; \"quoted\"", result.Output);
    }

    [Fact]
    public async Task Convert_Returns_Line_And_Column_For_Invalid_Json()
    {
        var input = "{\n  \"name\":\n}";

        var result = await _executor.ExecuteAsync(new ToolRequest("convert", input));

        Assert.False(result.Success);
        Assert.Contains("line", result.Error, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("column", result.Error, StringComparison.OrdinalIgnoreCase);
    }
}
