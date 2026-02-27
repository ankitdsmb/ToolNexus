using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface IAiToolPackageImportService
{
    AiToolPackageTemplateResponse GetTemplate();
    Task<AiToolContractGenerationResponse> GenerateContractAsync(AiToolContractGenerationRequest request, CancellationToken cancellationToken);
    Task<AiToolPackageImportValidationResult> ValidateAsync(string jsonPayload, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> CreateDraftAsync(AiToolPackageImportRequest request, CancellationToken cancellationToken);
    Task<AiToolPackageContract?> GetContractBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<AiRuntimeInspectionResponse?> InspectRuntimeAsync(string slug, CancellationToken cancellationToken);
    Task<AiContractSuggestionsResponse?> GetContractSuggestionsAsync(string slug, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> ApplyJsonPatchAsync(string slug, AiJsonPatchUpdateRequest request, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> SubmitForApprovalAsync(string slug, AiApprovalSubmissionRequest request, CancellationToken cancellationToken);
    Task<AiToolPackageRecord> DecideApprovalAsync(string slug, AiApprovalDecisionRequest request, CancellationToken cancellationToken);
}
