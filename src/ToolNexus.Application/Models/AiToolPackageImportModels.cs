namespace ToolNexus.Application.Models;

public enum AiToolPackageStatus
{
    Draft,
    Disabled,
    Active
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
    string JsonPayload,
    DateTime CreatedUtc,
    DateTime UpdatedUtc,
    int Version);

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
