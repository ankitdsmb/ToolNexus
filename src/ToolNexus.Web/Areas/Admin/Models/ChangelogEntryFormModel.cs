using System.ComponentModel.DataAnnotations;

namespace ToolNexus.Web.Areas.Admin.Models;

public sealed class ChangelogEntryFormModel
{
    public Guid? Id { get; set; }

    [Required]
    [MaxLength(32)]
    public string Version { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(Added|Improved|Fixed|Removed)$")]
    public string Tag { get; set; } = "Added";

    [Required]
    [DataType(DataType.Date)]
    public DateTime ReleaseDate { get; set; } = DateTime.UtcNow.Date;
}
