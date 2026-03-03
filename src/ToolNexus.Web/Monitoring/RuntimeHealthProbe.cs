using ToolNexus.Web.Services;

namespace ToolNexus.Web.Monitoring;

public interface IRuntimeHealthProbe
{
    ExtendedHealthSnapshot GetSnapshot();
}

public sealed record ExtendedHealthSnapshot(bool ManifestLoaded, string RuntimeIntegrityState, string MutationModeStatus, int ManifestCount);

public sealed class RuntimeHealthProbe(
    IWebHostEnvironment hostEnvironment,
    IToolRegistryService toolRegistryService,
    IConfiguration configuration) : IRuntimeHealthProbe
{
    private static readonly string[] RequiredRuntimeAnchors =
    [
        "data-tool-shell",
        "data-tool-context",
        "data-tool-status",
        "data-tool-followup",
        "data-tool-content-host",
        "data-tool-input",
        "data-tool-output"
    ];

    public ExtendedHealthSnapshot GetSnapshot()
    {
        var manifests = toolRegistryService.GetAll();
        var manifestLoaded = manifests.Count > 0;
        var integrityState = EvaluateRuntimeIntegrity();
        var mutationModeStatus = ResolveMutationModeStatus();

        return new ExtendedHealthSnapshot(manifestLoaded, integrityState, mutationModeStatus, manifests.Count);
    }

    private string EvaluateRuntimeIntegrity()
    {
        try
        {
            var toolShellPath = Path.Combine(hostEnvironment.ContentRootPath, "Views", "Tools", "ToolShell.cshtml");
            if (!File.Exists(toolShellPath))
            {
                return "missing_tool_shell";
            }

            var shellMarkup = File.ReadAllText(toolShellPath);
            var missingAnchors = RequiredRuntimeAnchors
                .Where(anchor => !shellMarkup.Contains(anchor, StringComparison.Ordinal))
                .ToArray();

            if (missingAnchors.Length > 0)
            {
                return "anchor_contract_violation";
            }

            var webRootPath = string.IsNullOrWhiteSpace(hostEnvironment.WebRootPath)
                ? Path.Combine(hostEnvironment.ContentRootPath, "wwwroot")
                : hostEnvironment.WebRootPath;
            var runtimeScriptPath = Path.Combine(webRootPath, "js", "tool-runtime.js");
            if (!File.Exists(runtimeScriptPath))
            {
                return "missing_runtime_script";
            }

            return "healthy";
        }
        catch
        {
            return "unknown";
        }
    }

    private string ResolveMutationModeStatus()
    {
        var runtimeDiagnosticsEnabled = configuration.GetValue<bool?>("LoggingOptions:RuntimeDiagnosticsEnabled");
        if (runtimeDiagnosticsEnabled.HasValue)
        {
            return runtimeDiagnosticsEnabled.Value ? "diagnostic_mutation_monitoring_enabled" : "diagnostic_mutation_monitoring_disabled";
        }

        return "client_managed";
    }
}
