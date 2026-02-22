using System.ComponentModel.DataAnnotations;
using ToolNexus.Application.Models;

namespace ToolNexus.Web.Areas.Admin.Models;

public sealed class ToolAdminIndexViewModel
{
    public required IReadOnlyCollection<ToolDefinitionListItem> Tools { get; init; }
    public ToolAdminFormModel Form { get; init; } = new();
}

public sealed class ToolAdminFormModel
{
    public int? Id { get; set; }
    [Required] public string Name { get; set; } = string.Empty;
    [Required] public string Slug { get; set; } = string.Empty;
    [Required] public string Description { get; set; } = string.Empty;
    [Required] public string Category { get; set; } = string.Empty;
    [Required] public string Status { get; set; } = "Enabled";
    [Required] public string Icon { get; set; } = "ti ti-tool";
    public int SortOrder { get; set; }
    [Required] public string InputSchema { get; set; } = "{}";
    [Required] public string OutputSchema { get; set; } = "{}";
    [Required] public string ExecutionMode { get; set; } = "Local";
    [Range(1, 3600)] public int TimeoutSeconds { get; set; } = 30;
    [Range(1, 100000)] public int MaxRequestsPerMinute { get; set; } = 120;
    [Range(1, 10_000_000)] public int MaxInputSize { get; set; } = 1_000_000;
    public bool IsExecutionEnabled { get; set; } = true;

    public CreateToolDefinitionRequest ToCreate() => new(Name, Slug, Description, Category, Status, Icon, SortOrder, InputSchema, OutputSchema);
    public UpdateToolDefinitionRequest ToUpdate() => new(Name, Slug, Description, Category, Status, Icon, SortOrder, InputSchema, OutputSchema);

    public static ToolAdminFormModel FromDetail(ToolDefinitionDetail detail) => new()
    {
        Id = detail.Id,
        Name = detail.Name,
        Slug = detail.Slug,
        Description = detail.Description,
        Category = detail.Category,
        Status = detail.Status,
        Icon = detail.Icon,
        SortOrder = detail.SortOrder,
        InputSchema = detail.InputSchema,
        OutputSchema = detail.OutputSchema,
        ExecutionMode = "Local",
        TimeoutSeconds = 30,
        MaxRequestsPerMinute = 120,
        MaxInputSize = 1_000_000,
        IsExecutionEnabled = true
    };
}
