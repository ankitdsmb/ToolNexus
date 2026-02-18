using System.Reflection;

namespace ToolNexus.Web.Services;

public sealed class AppVersionService : IAppVersionService
{
    public string VersionDisplay { get; }
    public string BuildNumber { get; }

    public AppVersionService(IHostEnvironment environment)
    {
        var assembly = Assembly.GetEntryAssembly() ?? Assembly.GetExecutingAssembly();
        var informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        var normalized = informationalVersion?.Split('+')[0];

        if (!string.IsNullOrWhiteSpace(normalized))
        {
            VersionDisplay = normalized.StartsWith('v') ? normalized : $"v{normalized}";
        }
        else
        {
            var version = assembly.GetName().Version;
            VersionDisplay = version is null
                ? "v0.0.0"
                : $"v{version.Major}.{version.Minor}.{Math.Max(version.Build, 0)}";
        }

        var configuredBuild = Environment.GetEnvironmentVariable("TOOLNEXUS_BUILD_NUMBER");
        BuildNumber = !string.IsNullOrWhiteSpace(configuredBuild)
            ? configuredBuild
            : $"{environment.EnvironmentName.ToLowerInvariant()}-{DateTime.UtcNow:yyyyMMddHHmm}";
    }
}
