using ToolNexus.Application.Contracts;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IToolService
{
    Task<ToolExecutionResultDto> ExecuteAsync(ToolExecutionRequest request, CancellationToken cancellationToken = default);
}
