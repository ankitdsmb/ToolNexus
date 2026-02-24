namespace ToolNexus.Application.Services;

public sealed class ManifestStartupValidator(IToolManifestGovernance governance) : IStartupPhaseService
{
    public int Order => 4;

    public string PhaseName => "Manifest Startup Validation";

    public Task ExecuteAsync(CancellationToken cancellationToken)
    {
        _ = governance.GetAll();
        return Task.CompletedTask;
    }
}
