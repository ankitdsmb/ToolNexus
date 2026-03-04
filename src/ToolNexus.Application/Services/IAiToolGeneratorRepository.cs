using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiToolGeneratorRepository
{
    Task<AiGeneratedToolRecord> CreateDraftAsync(string prompt, string schema, string manifest, CancellationToken cancellationToken);
}
