using Polly;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Policies;

namespace ToolNexus.Application.Services.Pipeline;

public interface IToolExecutionResiliencePipelineProvider
{
    ResiliencePipeline<ToolExecutionResponse> GetPipeline(string toolSlug, IToolExecutionPolicy policy);
}
