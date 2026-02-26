namespace ToolNexus.Application.Models;

public sealed record AdminControlPlaneOperationResult(
    string OperationName,
    string Status,
    string Message,
    int AffectedRecords,
    string CorrelationId,
    string ImpactScope,
    string AuthorityContext,
    string? RollbackInfo);
