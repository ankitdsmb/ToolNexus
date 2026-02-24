using System.ComponentModel.DataAnnotations;

namespace ToolNexus.Web.Models;

public sealed class AuthLoginViewModel
{
    [Required]
    [EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    public string Password { get; init; } = string.Empty;

    public string? ReturnUrl { get; init; }
}
