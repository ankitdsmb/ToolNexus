namespace ToolNexus.Web.Models;

public sealed class ToolShellLayoutViewModel
{
    public required ToolPageViewModel Page { get; init; }
    public required ToolDocsPanelViewModel Docs { get; init; }
}

public sealed class ToolEditorPanelViewModel
{
    public required string ToolTitle { get; init; }
    public required string SeoDescription { get; init; }
}

public sealed class ToolOutputPanelViewModel
{
    public static ToolOutputPanelViewModel Empty { get; } = new();
}

public sealed class ToolConsolePanelViewModel
{
    public required string ToolTitle { get; init; }
}

public sealed class ToolWorkflowPanelViewModel
{
    public required ToolOutputPanelViewModel Output { get; init; }
    public required ToolConsolePanelViewModel Console { get; init; }
}

public sealed class ToolDocsPanelViewModel
{
    public required ToolPageViewModel Page { get; init; }
    public required IReadOnlyCollection<ToolDocsSectionViewModel> Sections { get; init; }
}

public sealed class ToolDocsSectionViewModel
{
    public required string Plugin { get; init; }
    public required string Label { get; init; }
    public required bool IsPrimary { get; init; }
}
