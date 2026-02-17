using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolService(IToolExecutionPipeline pipeline) : IToolService
{
    public Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        if (request is null)
        {
            return Task.FromResult(new ToolExecutionResponse(
                false,
                null,
                new ToolError("invalid_request", "Request is required.", null),
                new ToolExecutionMetadata(0, false)));
        }

        return pipeline.ExecuteAsync(request.Slug, request.Action, request.Input, cancellationToken);
    }
}
