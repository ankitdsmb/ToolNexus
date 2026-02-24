using Microsoft.AspNetCore.Routing;
using ToolNexus.Api.Logging;

namespace ToolNexus.Api.Diagnostics;

public sealed class EndpointDiagnosticsHostedService(
    IEnumerable<EndpointDataSource> endpointDataSources,
    ILoggerFactory loggerFactory) : IHostedService
{
    private readonly ILogger _logger = loggerFactory.CreateLogger(LoggingCategories.ToolSyncLogger);

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var endpoints = endpointDataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .OrderBy(endpoint => endpoint.RoutePattern.RawText, StringComparer.OrdinalIgnoreCase)
            .ThenBy(endpoint => endpoint.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        _logger.LogInformation("Registered {EndpointCount} route endpoints.", endpoints.Length);

        foreach (var endpoint in endpoints)
        {
            var metadata = endpoint.Metadata.Select(m => m.GetType().Name).OrderBy(x => x, StringComparer.Ordinal).ToArray();
            _logger.LogInformation(
                "Endpoint: {RoutePattern} | DisplayName: {DisplayName} | Order: {Order} | Metadata: [{Metadata}]",
                endpoint.RoutePattern.RawText,
                endpoint.DisplayName,
                endpoint.Order,
                string.Join(", ", metadata));
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
