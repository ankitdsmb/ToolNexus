using Microsoft.AspNetCore.Routing;
using System.Threading;
using ToolNexus.Application.Services;
using ToolNexus.Api.Logging;

namespace ToolNexus.Api.Diagnostics;

public sealed class EndpointDiagnosticsHostedService(
    IEnumerable<EndpointDataSource> endpointDataSources,
    IToolManifestGovernance manifestGovernance,
    IHostApplicationLifetime applicationLifetime,
    ILoggerFactory loggerFactory) : IHostedService
{
    private readonly ILogger _logger = loggerFactory.CreateLogger(LoggingCategories.ToolSyncLogger);
    private int _hasLogged;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        applicationLifetime.ApplicationStarted.Register(LogRouteAndToolEndpoints);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private void LogRouteAndToolEndpoints()
    {
        if (Interlocked.Exchange(ref _hasLogged, 1) != 0)
        {
            return;
        }

        var endpoints = endpointDataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .OrderBy(endpoint => endpoint.RoutePattern.RawText, StringComparer.OrdinalIgnoreCase)
            .ThenBy(endpoint => endpoint.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        _logger.LogInformation("[RouteMapping] Registered {EndpointCount} route endpoints.", endpoints.Length);

        foreach (var endpoint in endpoints)
        {
            var metadata = endpoint.Metadata.Select(m => m.GetType().Name).OrderBy(x => x, StringComparer.Ordinal).ToArray();
            _logger.LogInformation(
                "[RouteMapping] Endpoint: {RoutePattern} | DisplayName: {DisplayName} | Order: {Order} | Metadata: [{Metadata}]",
                endpoint.RoutePattern.RawText,
                endpoint.DisplayName,
                endpoint.Order,
                string.Join(", ", metadata));
        }

        var manifests = manifestGovernance.GetAll();
        var mappedToolEndpoints = manifests.Sum(x => x.SupportedActions.Count);
        _logger.LogInformation(
            "[ToolEndpointRegistration] Registered {MappedToolEndpoints} tool action endpoints from {ToolCount} synchronized manifests.",
            mappedToolEndpoints,
            manifests.Count);
    }
}
