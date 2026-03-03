namespace ToolNexus.Web.Runtime;

internal static class ToolContextPlugins
{
    private const string PluginViewsDirectoryRelativePath = "Views/Tools/Plugins";

    internal static readonly string[] All =
    {
        "Overview",
        "Features",
        "QuickStart",
        "Guidance",
        "Examples",
        "UseCases",
        "Faq",
        "RelatedTools"
    };

    internal static string ToPartialPath(string plugin)
        => $"~/Views/Tools/Plugins/_{plugin}Plugin.cshtml";

    internal static string ToPluginFilePath(string contentRootPath, string plugin)
        => Path.Combine(contentRootPath, "Views", "Tools", "Plugins", $"_{plugin}Plugin.cshtml");

    internal static string GetPluginViewsDirectoryPath(string contentRootPath)
        => Path.Combine(contentRootPath, "Views", "Tools", "Plugins");

    internal static IReadOnlyList<string> GetActualPluginPartials(string contentRootPath)
    {
        var pluginDirectoryPath = GetPluginViewsDirectoryPath(contentRootPath);
        if (!Directory.Exists(pluginDirectoryPath))
        {
            return Array.Empty<string>();
        }

        return Directory
            .EnumerateFiles(pluginDirectoryPath, "*.cshtml", SearchOption.TopDirectoryOnly)
            .Select(Path.GetFileName)
            .Where(fileName => !string.IsNullOrWhiteSpace(fileName))
            .Select(fileName => fileName!)
            .OrderBy(fileName => fileName, StringComparer.Ordinal)
            .ToArray();
    }

    internal static ToolPluginGovernanceSnapshot BuildGovernanceSnapshot(string contentRootPath)
    {
        var declaredPlugins = All
            .Select(ToPartialPath)
            .OrderBy(path => path, StringComparer.Ordinal)
            .ToArray();

        var actualPartialFiles = GetActualPluginPartials(contentRootPath)
            .Select(fileName => $"~/{PluginViewsDirectoryRelativePath}/{fileName}")
            .ToArray();

        var declaredSet = declaredPlugins.ToHashSet(StringComparer.Ordinal);
        var actualSet = actualPartialFiles.ToHashSet(StringComparer.Ordinal);

        var undeclaredPartials = actualPartialFiles
            .Where(path => !declaredSet.Contains(path))
            .ToArray();

        var missingPartials = declaredPlugins
            .Where(path => !actualSet.Contains(path))
            .ToArray();

        return new ToolPluginGovernanceSnapshot(
            declaredPlugins,
            actualPartialFiles,
            undeclaredPartials,
            missingPartials);
    }

    internal static IReadOnlyList<string> GetMissingPluginPartials(string contentRootPath)
    {
        return All
            .Where(plugin => !File.Exists(ToPluginFilePath(contentRootPath, plugin)))
            .ToArray();
    }
}

internal sealed record ToolPluginGovernanceSnapshot(
    IReadOnlyList<string> DeclaredPlugins,
    IReadOnlyList<string> ActualPartialFiles,
    IReadOnlyList<string> UndeclaredPartials,
    IReadOnlyList<string> MissingPartials)
{
    public int MismatchCount => UndeclaredPartials.Count + MissingPartials.Count;
}
