namespace ToolNexus.Application.Abstractions;

public enum ToolRuntimeLanguage
{
    DotNet = 0
}

public static class ToolRuntimeLanguageParser
{
    public const string DotNetLegacyValue = "dotnet";

    public static ToolRuntimeLanguage ParseOrDefault(string? value)
        => TryParse(value, out var language) ? language : ToolRuntimeLanguage.DotNet;

    public static bool TryParse(string? value, out ToolRuntimeLanguage language)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            language = ToolRuntimeLanguage.DotNet;
            return false;
        }

        if (string.Equals(value.Trim(), DotNetLegacyValue, StringComparison.OrdinalIgnoreCase)
            || string.Equals(value.Trim(), "csharp", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value.Trim(), "cs", StringComparison.OrdinalIgnoreCase))
        {
            language = ToolRuntimeLanguage.DotNet;
            return true;
        }

        language = ToolRuntimeLanguage.DotNet;
        return false;
    }

    public static string ToLegacyValue(this ToolRuntimeLanguage language)
        => language switch
        {
            ToolRuntimeLanguage.DotNet => DotNetLegacyValue,
            _ => DotNetLegacyValue
        };
}
