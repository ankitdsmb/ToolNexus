using ToolNexus.Tools.Common;

namespace ToolNexus.Api.Application;

public interface IToolExecutionService
{
    Task<ToolExecutionOutcome> ExecuteAsync(string slug, string action, ToolRequest request, CancellationToken cancellationToken);
}

public sealed record ToolExecutionOutcome(bool ToolFound, ToolResult Result);
