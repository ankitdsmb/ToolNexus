using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IExecutionAuthorityResolver
{
    ExecutionAuthority ResolveAuthority(ToolExecutionContext context, UniversalToolExecutionRequest request);
}
