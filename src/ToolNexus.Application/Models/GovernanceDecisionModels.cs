namespace ToolNexus.Application.Models;

public enum GovernanceDecisionStatus
{
    Approved = 1,
    Denied = 2,
    Override = 3
}

public sealed record GovernanceDecisionRecord(
    Guid DecisionId,
    string ToolId,
    string CapabilityId,
    string Authority,
    string ApprovedBy,
    string DecisionReason,
    string PolicyVersion,
    DateTime TimestampUtc,
    GovernanceDecisionStatus Status);

public sealed record GovernanceDecisionQuery(
    int Page,
    int PageSize,
    string? ToolId,
    string? PolicyVersion,
    DateTime? StartDateUtc,
    DateTime? EndDateUtc);

public sealed record GovernanceDecisionPage(
    int Page,
    int PageSize,
    int TotalItems,
    IReadOnlyList<GovernanceDecisionRecord> Items);
