using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IUniversalExecutionRequestMapper
{
    UniversalExecutionRequest Map(ToolExecutionContext context);
}
