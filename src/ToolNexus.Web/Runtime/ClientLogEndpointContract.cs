using Microsoft.AspNetCore.Routing;

namespace ToolNexus.Web.Runtime;

public sealed class ClientLogEndpointContract(
    IConfiguration configuration,
    EndpointDataSource endpointDataSource,
    ILogger<ClientLogEndpointContract> logger)
{
    private const string RuntimeLogEndpointKey = "LoggingOptions:RuntimeLogEndpoint";
    private const string RuntimeCaptureEnabledKey = "LoggingOptions:EnableRuntimeLogCapture";
    private const string CanonicalRuntimeLogEndpoint = "/api/admin/runtime/incidents/logs";

    public string? ResolveRoutableEndpointOrNull()
    {
        var isCaptureEnabled = configuration.GetValue<bool>(RuntimeCaptureEnabledKey, true);
        var configuredEndpoint = configuration[RuntimeLogEndpointKey];

        if (!isCaptureEnabled)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(configuredEndpoint))
        {
            throw new InvalidOperationException($"{RuntimeLogEndpointKey} must be configured when runtime log capture is enabled.");
        }

        var endpointPath = NormalizeToAbsolutePath(configuredEndpoint);
        if (endpointPath is null)
        {
            throw new InvalidOperationException($"{RuntimeLogEndpointKey} must be app-routable (relative path). Received '{configuredEndpoint}'.");
        }

        var routablePaths = GetRoutablePaths();
        if (routablePaths.Count == 0)
        {
            if (!string.Equals(endpointPath, CanonicalRuntimeLogEndpoint, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Runtime log endpoint '{endpointPath}' is not canonical. Expected '{CanonicalRuntimeLogEndpoint}'.");
            }

            logger.LogWarning("Runtime route discovery returned no endpoints. Falling back to canonical endpoint assertion for {EndpointPath}.", endpointPath);
            return endpointPath;
        }

        if (!routablePaths.Contains(endpointPath, StringComparer.OrdinalIgnoreCase))
        {
            var knownPaths = string.Join(", ", routablePaths.Where(static p => p.Contains("runtime", StringComparison.OrdinalIgnoreCase)).OrderBy(static p => p, StringComparer.OrdinalIgnoreCase));
            throw new InvalidOperationException(
                $"Runtime log endpoint '{endpointPath}' is not routable in ToolNexus.Web. Configure {RuntimeLogEndpointKey} to a mapped route. Known runtime routes: {knownPaths}.");
        }

        logger.LogInformation("Runtime client log endpoint contract validated: {EndpointPath}", endpointPath);
        return endpointPath;
    }

    private static string? NormalizeToAbsolutePath(string endpoint)
    {
        var candidate = endpoint.Trim();
        if (!candidate.StartsWith('/'))
        {
            return null;
        }

        if (!Uri.TryCreate($"https://contract.local{candidate}", UriKind.Absolute, out var uri))
        {
            return null;
        }

        return uri.AbsolutePath;
    }

    private HashSet<string> GetRoutablePaths()
    {
        return endpointDataSource.Endpoints
            .OfType<RouteEndpoint>()
            .Select(static endpoint => endpoint.RoutePattern.RawText)
            .Where(static text => !string.IsNullOrWhiteSpace(text))
            .Select(static text => text!.StartsWith('/') ? text : $"/{text}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
}
