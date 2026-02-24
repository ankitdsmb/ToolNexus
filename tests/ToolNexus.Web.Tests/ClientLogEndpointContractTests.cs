using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Web.Runtime;

namespace ToolNexus.Web.Tests;

public sealed class ClientLogEndpointContractTests
{
    [Fact]
    public void ResolveRoutableEndpointOrNull_ReturnsConfiguredEndpoint_WhenEndpointIsMapped()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["LoggingOptions:EnableRuntimeLogCapture"] = "true",
            ["LoggingOptions:RuntimeLogEndpoint"] = "/api/admin/runtime/incidents/logs"
        });

        var contract = new ClientLogEndpointContract(
            configuration,
            BuildEndpointDataSource("api/admin/runtime/incidents/logs"),
            NullLogger<ClientLogEndpointContract>.Instance);

        var endpoint = contract.ResolveRoutableEndpointOrNull();

        Assert.Equal("/api/admin/runtime/incidents/logs", endpoint);
    }

    [Fact]
    public void ResolveRoutableEndpointOrNull_Throws_WhenConfiguredEndpointIsNotRoutable()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["LoggingOptions:EnableRuntimeLogCapture"] = "true",
            ["LoggingOptions:RuntimeLogEndpoint"] = "/api/admin/runtime/logs"
        });

        var contract = new ClientLogEndpointContract(
            configuration,
            BuildEndpointDataSource("api/admin/runtime/incidents/logs"),
            NullLogger<ClientLogEndpointContract>.Instance);

        var exception = Assert.Throws<InvalidOperationException>(() => contract.ResolveRoutableEndpointOrNull());
        Assert.Contains("not routable", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ResolveRoutableEndpointOrNull_ReturnsNull_WhenCaptureDisabled()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["LoggingOptions:EnableRuntimeLogCapture"] = "false"
        });

        var contract = new ClientLogEndpointContract(
            configuration,
            BuildEndpointDataSource("api/admin/runtime/incidents/logs"),
            NullLogger<ClientLogEndpointContract>.Instance);

        Assert.Null(contract.ResolveRoutableEndpointOrNull());
    }

    private static IConfiguration BuildConfiguration(IReadOnlyDictionary<string, string?> values)
        => new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();

    private static EndpointDataSource BuildEndpointDataSource(string template)
    {
        var builder = new RouteEndpointBuilder(
            requestDelegate: _ => Task.CompletedTask,
            routePattern: RoutePatternFactory.Parse(template),
            order: 0);

        return new DefaultEndpointDataSource(builder.Build());
    }
}
