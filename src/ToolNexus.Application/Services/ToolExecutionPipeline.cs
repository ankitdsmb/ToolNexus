using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ToolExecutionPipeline(
    ToolService toolService,
    IEnumerable<IToolExecutionPreProcessor> preProcessors) : IToolService
{
    public async Task<ToolExecutionResponse> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default)
    {
        var current = request;
        foreach (var preProcessor in preProcessors)
        {
            current = await preProcessor.ProcessAsync(current, cancellationToken);
        }

        return await toolService.ExecuteAsync(current, cancellationToken);
    }
}
