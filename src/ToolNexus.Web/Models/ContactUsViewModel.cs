using System.ComponentModel.DataAnnotations;

namespace ToolNexus.Web.Models;

public sealed class ContactUsViewModel
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(180)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(180, MinimumLength = 3)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [StringLength(4000, MinimumLength = 10)]
    public string Message { get; set; } = string.Empty;

    public bool Submitted { get; set; }
}
