namespace ToolNexus.Web.Models;

public sealed class OptimizedCssResult
{
    public string OptimizedCss { get; init; } = string.Empty;

    public int OriginalSize { get; init; }

    public int OptimizedSize { get; init; }

    public double SavingsPercent { get; init; }
}
