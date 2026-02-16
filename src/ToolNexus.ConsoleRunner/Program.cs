using ToolNexus.Domain;
using ToolNexus.Infrastructure.Executors;

var executors = new List<IToolExecutor>
{
    new JsonToolExecutor()
};

var tool = executors.First(x => x.Slug == "json-formatter");
var request = new ToolRequest("{\"hello\":\"world\"}", new Dictionary<string, string> { ["action"] = "format" });
var result = await tool.ExecuteAsync(request);

Console.WriteLine($"Success: {result.Success}");
Console.WriteLine(result.Output);
