using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IExecutionConformanceValidator
{
    ExecutionConformanceResult Validate(UniversalToolExecutionResult result, UniversalToolExecutionRequest request);
}
