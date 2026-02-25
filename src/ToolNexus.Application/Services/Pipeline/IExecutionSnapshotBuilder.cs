using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services.Pipeline;

public interface IExecutionSnapshotBuilder
{
    ExecutionSnapshot BuildSnapshot(
        UniversalToolExecutionRequest request,
        ToolExecutionContext context,
        ExecutionAuthority authority);
}
