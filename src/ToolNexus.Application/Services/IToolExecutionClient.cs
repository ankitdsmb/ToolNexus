using ToolNexus.Domain;

namespace ToolNexus.Application.Services;

public interface IToolExecutionClient
{
    Task<ToolExecutionClientResult> ExecuteAsync(
        string slug,
        ToolRequest request,
        CancellationToken cancellationToken = default);
}

public sealed record ToolExecutionClientResult(bool Found, ToolResult? Result)
{
    public static ToolExecutionClientResult ToolNotFound() => new(false, null);

    public static ToolExecutionClientResult Executed(ToolResult result) => new(true, result);
}
