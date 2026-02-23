namespace ToolNexus.Application.Models;

public sealed record ToolDefinitionListItem(
    int Id,
    string Name,
    string Slug,
    string Category,
    string Status,
    DateTimeOffset UpdatedAt,
    string? VersionToken = null);

public sealed record ToolDefinitionDetail(
    int Id,
    string Name,
    string Slug,
    string Description,
    string Category,
    string Status,
    string Icon,
    int SortOrder,
    string InputSchema,
    string OutputSchema,
    DateTimeOffset UpdatedAt,
    string? VersionToken = null);

public sealed record CreateToolDefinitionRequest(
    string Name,
    string Slug,
    string Description,
    string Category,
    string Status,
    string Icon,
    int SortOrder,
    string InputSchema,
    string OutputSchema);

public sealed record UpdateToolDefinitionRequest(
    string Name,
    string Slug,
    string Description,
    string Category,
    string Status,
    string Icon,
    int SortOrder,
    string InputSchema,
    string OutputSchema);
