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
        OutputSchema = detail.OutputSchema
    };
}
