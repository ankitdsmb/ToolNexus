using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public delegate Task<ToolExecutionResponse> ToolExecutionDelegate(ToolExecutionContext context, CancellationToken cancellationToken);

public interface IToolExecutionStep
{
    int Order { get; }

    Task<ToolExecutionResponse> InvokeAsync(ToolExecutionContext context, ToolExecutionDelegate next, CancellationToken cancellationToken);
}
