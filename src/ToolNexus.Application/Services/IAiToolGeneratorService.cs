using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiToolGeneratorService
{
    Task<AiGeneratedToolRecord> GenerateToolDraftAsync(AiToolGenerationRequest request, CancellationToken cancellationToken);
}
