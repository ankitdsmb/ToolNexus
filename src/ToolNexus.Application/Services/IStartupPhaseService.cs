namespace ToolNexus.Application.Services;

public interface IStartupPhaseService
{
    int Order { get; }

    string PhaseName { get; }

    Task ExecuteAsync(CancellationToken cancellationToken);
}

