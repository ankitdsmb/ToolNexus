namespace ToolNexus.Web.Services;

public interface IToolManifestLoader
{
    IReadOnlyCollection<ToolManifest> LoadAll();
}
