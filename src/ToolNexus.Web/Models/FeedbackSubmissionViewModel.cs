using System.ComponentModel.DataAnnotations;

namespace ToolNexus.Web.Models;

public sealed class FeedbackSubmissionViewModel
{
    [Display(Name = "Name (optional)")]
    [StringLength(120)]
    public string? Name { get; set; }

    [Display(Name = "Email (optional)")]
    [EmailAddress]
    [StringLength(254)]
    public string? Email { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;

    [Required]
    [Display(Name = "Feedback message")]
    [StringLength(4000, MinimumLength = 10)]
    public string Message { get; set; } = string.Empty;

    [Display(Name = "Attach screenshot URL (optional)")]
    [Url]
    [StringLength(2048)]
    public string? ScreenshotUrl { get; set; }

    public static IReadOnlyCollection<string> Categories { get; } =
    [
        "Bug Report",
        "Feature Request",
        "Improvement",
        "General Feedback"
    ];
}
