using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiToolPackageImportService
{
    AiToolPackageTemplateResponse GetTemplate();
    Task<AiToolPackageImportValidationResult> ValidateAsync(string jsonPayload, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> CreateDraftAsync(AiToolPackageImportRequest request, CancellationToken cancellationToken);
    Task<AiToolPackageContract?> GetContractBySlugAsync(string slug, CancellationToken cancellationToken);
}
