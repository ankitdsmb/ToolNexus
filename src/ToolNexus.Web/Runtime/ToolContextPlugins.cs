namespace ToolNexus.Web.Runtime;

internal static class ToolContextPlugins
{
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

    internal static IReadOnlyList<string> GetMissingPluginPartials(string contentRootPath)
    {
        return All
            .Where(plugin => !File.Exists(ToPluginFilePath(contentRootPath, plugin)))
            .ToArray();
    }
}
