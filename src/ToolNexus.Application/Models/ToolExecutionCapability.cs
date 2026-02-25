namespace ToolNexus.Application.Models;

/// <summary>
/// Strongly typed execution capability identifier used to describe runtime requirements.
/// </summary>
public readonly record struct ToolExecutionCapability(string Value)
{
    public static readonly ToolExecutionCapability Standard = new("standard");
    public static readonly ToolExecutionCapability Sandboxed = new("sandboxed");
    public static readonly ToolExecutionCapability Restricted = new("restricted");
    public static readonly ToolExecutionCapability HighResource = new("highresource");

    public static ToolExecutionCapability From(string? value, ToolExecutionCapability defaultCapability)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return defaultCapability;
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "standard" => Standard,
            "sandboxed" => Sandboxed,
            "restricted" => Restricted,
            "highresource" => HighResource,
            _ => new ToolExecutionCapability(normalized)
        };
    }

    public override string ToString() => Value;
}
