using ToolNexus.Tools.Common;
using ToolNexus.Tools.Json;

var executors = new List<IToolExecutor>
{
    new JsonToolExecutor()
};

var tool = executors.First(x => x.Slug == "json-formatter");
var request = new ToolRequest("format", "{\"hello\":\"world\"}");
var result = await tool.ExecuteAsync(request);

Console.WriteLine($"Success: {result.Success}");
Console.WriteLine(result.Output);
