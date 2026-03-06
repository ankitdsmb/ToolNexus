using System.ComponentModel.DataAnnotations;

namespace ToolNexus.Web.Areas.Admin.Models;

public sealed class RoadmapAdminViewModel
{
    public IReadOnlyList<RoadmapAdminItemViewModel> Items { get; init; } = [];
    public CreateRoadmapItemFormModel CreateForm { get; init; } = new();
}

public sealed class RoadmapAdminItemViewModel
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string Priority { get; init; } = string.Empty;
    public int Votes { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class CreateRoadmapItemFormModel
{
    [Required, MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(1500)]
    public string Description { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string Category { get; set; } = "Platform";

    [Required, MaxLength(40)]
    public string Status { get; set; } = "Planned";

    [Required, MaxLength(40)]
    public string Priority { get; set; } = "Medium";
}

public sealed class UpdateRoadmapStatusFormModel
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

public sealed class UpdateRoadmapDescriptionFormModel
{
    [Required, MaxLength(1500)]
    public string Description { get; set; } = string.Empty;
}
