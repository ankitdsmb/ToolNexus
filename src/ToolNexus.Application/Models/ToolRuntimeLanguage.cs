namespace ToolNexus.Application.Models;

/// <summary>
/// Strongly typed runtime language identifier used by universal execution components.
/// </summary>
public readonly record struct ToolRuntimeLanguage(string Value)
{
    public static readonly ToolRuntimeLanguage DotNet = new("dotnet");
    public static readonly ToolRuntimeLanguage Python = new("python");

    public static ToolRuntimeLanguage From(string? value, ToolRuntimeLanguage defaultLanguage)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return defaultLanguage;
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "dotnet" => DotNet,
            "python" => Python,
            _ => new ToolRuntimeLanguage(normalized)
        };
    }

    public override string ToString() => Value;
}
