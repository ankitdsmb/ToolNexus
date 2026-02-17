namespace ToolNexus.Application.Abstractions;

public sealed record ToolResult(bool Success, string Output, string? Error = null)
{
    public static ToolResult Ok(string output) => new(true, output);

    public static ToolResult Fail(string error) => new(false, string.Empty, error);
}
