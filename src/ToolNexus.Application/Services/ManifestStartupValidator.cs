using Microsoft.Extensions.Hosting;

namespace ToolNexus.Application.Services;

public sealed class ManifestStartupValidator(IToolManifestGovernance governance) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _ = governance.GetAll();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
