namespace ToolNexus.ConsoleRunner.Scaffolding;

public enum ToolTemplateKind
{
    Utility = 1,
    Structured = 2,
    CustomUi = 3
}

public static class ToolTemplateKindParser
{
    public static ToolTemplateKind Parse(string value)
    {
        return value.Trim().ToLowerInvariant() switch
        {
            "utility" or "tier1" => ToolTemplateKind.Utility,
            "structured" or "tier2" => ToolTemplateKind.Structured,
            "custom-ui" or "custom" or "tier3" => ToolTemplateKind.CustomUi,
            _ => throw new InvalidOperationException($"Unknown template '{value}'. Use utility, structured, or custom-ui.")
        };
    }

    public static string ToName(this ToolTemplateKind template)
    {
        return template switch
        {
            ToolTemplateKind.Utility => "utility (tier1)",
            ToolTemplateKind.Structured => "structured (tier2)",
            ToolTemplateKind.CustomUi => "custom-ui (tier3)",
            _ => "utility (tier1)"
        };
    }

    public static int ToComplexityTier(this ToolTemplateKind template)
    {
        return template switch
        {
            ToolTemplateKind.Utility => 1,
            ToolTemplateKind.Structured => 2,
            ToolTemplateKind.CustomUi => 3,
            _ => 1
        };
    }
}
