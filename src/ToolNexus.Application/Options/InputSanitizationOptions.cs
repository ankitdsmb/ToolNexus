namespace ToolNexus.Application.Options;

public sealed class InputSanitizationOptions
{
    public const string SectionName = "Security:InputSanitization";

    public int MaxInputCharacters { get; set; } = 200000;

    public bool RejectControlCharacters { get; set; } = true;
}
