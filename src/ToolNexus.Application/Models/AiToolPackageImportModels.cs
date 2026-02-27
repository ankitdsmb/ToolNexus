using System.Text.Json;

namespace ToolNexus.Application.Models;

public enum AiToolPackageStatus
{
    Draft,
    Disabled,
    Active
}

public enum AiToolPackageApprovalStatus
{
    Draft,
    PendingApproval,
    Approved,
    Rejected
}

public sealed record AiToolVirtualFile(
    string Path,
    string Type,
    string Content);

public sealed record AiToolPackageContract(
    string ContractVersion,
    string Slug,
    string Tool,
    string Runtime,
    string Ui,
    string Seo,
    IReadOnlyList<AiToolVirtualFile> Files,
    string RawJsonPayload);

public sealed record AiToolPackageRecord(
    Guid Id,
    string Slug,
    AiToolPackageStatus Status,
    AiToolPackageApprovalStatus ApprovalStatus,
    string JsonPayload,
    DateTime CreatedUtc,
    DateTime UpdatedUtc,
    int Version,
    string? LastApprovalComment,
    string? ApprovedBy,
    DateTime? ApprovedAtUtc);

public sealed record AiToolPackageImportValidationResult(
    bool IsValid,
    IReadOnlyList<string> Errors,
    AiToolPackageContract? Contract);

public sealed record AiToolPackageImportRequest(
    string JsonPayload,
    string CorrelationId,
    string TenantId);

public sealed record AiToolPackageTemplateResponse(
    string JsonTemplate,
    string Prompt);

public sealed record AiToolContractGenerationRequest(
    string ToolIdea,
    IReadOnlyList<string>? ExistingToolSlugs,
    string CorrelationId,
    string TenantId);

public sealed record AiToolContractGenerationResponse(
    string Status,
    string? Message,
    string Slug,
    string? ContractJson);

public sealed record AiRuntimeInspectionResponse(
    string Slug,
    string RuntimeLanguage,
    bool UsesToolShell,
    bool HasTemplateFile,
    bool HasStylesFile,
    bool HasLogicModule,
    IReadOnlyList<string> Findings);

public sealed record AiContractSuggestion(
    string Code,
    string Severity,
    string Message,
    string JsonPointerPath,
    object? SuggestedValue);

public sealed record AiContractSuggestionsResponse(
    string Slug,
    IReadOnlyList<AiContractSuggestion> Suggestions);

public sealed record JsonPatchOperation(
    string Op,
    string Path,
    JsonElement? Value);

public sealed record AiJsonPatchUpdateRequest(
    IReadOnlyList<JsonPatchOperation> Operations,
    string CorrelationId,
    string TenantId,
    string RequestedBy);

public sealed record AiApprovalSubmissionRequest(
    string CorrelationId,
    string TenantId,
    string RequestedBy,
    string? Comment);

public sealed record AiApprovalDecisionRequest(
    bool Approve,
    string CorrelationId,
    string TenantId,
    string DecidedBy,
    string? Comment);
