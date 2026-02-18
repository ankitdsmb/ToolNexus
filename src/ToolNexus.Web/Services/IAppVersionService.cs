namespace ToolNexus.Web.Services;

public interface IAppVersionService
{
    string VersionDisplay { get; }
    string BuildNumber { get; }
}
