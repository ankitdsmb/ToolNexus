using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Infrastructure.Options;

namespace ToolNexus.Infrastructure.Content;

public sealed class DatabaseInitializationHostedService(
    IServiceProvider serviceProvider,
    IHostApplicationLifetime applicationLifetime,
    IOptions<DatabaseInitializationOptions> options,
    DatabaseInitializationState state,
    ILogger<DatabaseInitializationHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await WaitForHostStartupAsync(stoppingToken);

        if (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        using var scope = serviceProvider.CreateScope();
        var initializer = scope.ServiceProvider.GetRequiredService<ToolContentSeedHostedService>();

        try
        {
            await initializer.InitializeAsync(
                options.Value.RunMigrationOnStartup,
                options.Value.RunSeedOnStartup,
                stoppingToken);
            state.MarkReady();
            logger.LogInformation("Database initialization completed. Migration enabled: {RunMigration}. Seed enabled: {RunSeed}.",
                options.Value.RunMigrationOnStartup,
                options.Value.RunSeedOnStartup);
        }
        catch (Exception ex)
        {
            state.MarkFailed(ex.Message);
            logger.LogError(ex, "Database initialization failed. Host will continue running.");
        }
    }

    private async Task WaitForHostStartupAsync(CancellationToken cancellationToken)
    {
        if (applicationLifetime.ApplicationStarted.IsCancellationRequested)
        {
            return;
        }

        var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var startedRegistration = applicationLifetime.ApplicationStarted.Register(
            static callbackState => ((TaskCompletionSource)callbackState!).TrySetResult(),
            tcs);
        using var cancellationRegistration = cancellationToken.Register(
            static callbackState => ((TaskCompletionSource)callbackState!).TrySetCanceled(),
            tcs);
        await tcs.Task;
    }
}
