using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ToolNexus.Application.Abstractions;

namespace ToolNexus.Application.Services;

public sealed class ManifestExecutorAlignmentValidator(
    IToolManifestGovernance governance,
    IServiceScopeFactory scopeFactory,
    ILogger<ManifestExecutorAlignmentValidator> logger) : IStartupPhaseService
{
    public int Order => 5;

    public string PhaseName => "Manifest Executor Alignment Validation";

    public Task ExecuteAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var executors = scope.ServiceProvider.GetRequiredService<IEnumerable<IToolExecutor>>();

        var manifestBySlug = governance.GetAll().ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);
        var executorBySlug = executors.ToDictionary(x => x.Slug, StringComparer.OrdinalIgnoreCase);

        var missingExecutors = manifestBySlug.Keys.Except(executorBySlug.Keys, StringComparer.OrdinalIgnoreCase).ToArray();
        if (missingExecutors.Length > 0)
        {
            throw new InvalidOperationException($"Manifest slugs missing executors: {string.Join(", ", missingExecutors)}");
        }

        var unmanifestedExecutors = executorBySlug.Keys.Except(manifestBySlug.Keys, StringComparer.OrdinalIgnoreCase).ToArray();
        if (unmanifestedExecutors.Length > 0)
        {
            throw new InvalidOperationException($"Executor slugs missing manifest entries: {string.Join(", ", unmanifestedExecutors)}");
        }

        foreach (var (slug, manifest) in manifestBySlug)
        {
            var executor = executorBySlug[slug];
            var missingActions = manifest.SupportedActions
                .Except(executor.SupportedActions, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (missingActions.Length > 0)
            {
                throw new InvalidOperationException($"Manifest actions not supported by executor '{slug}': {string.Join(", ", missingActions)}");
            }
        }

        logger.LogInformation("Manifest and executor registration alignment validation passed for {ToolCount} tools.", manifestBySlug.Count);
        return Task.CompletedTask;
    }
}
