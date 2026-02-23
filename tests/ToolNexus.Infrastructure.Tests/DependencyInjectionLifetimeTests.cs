using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ToolNexus.Application;
using ToolNexus.Application.Services;
using ToolNexus.Application.Services.Policies;
using ToolNexus.Application.Services.Pipeline;
using ToolNexus.Infrastructure;
using Xunit;

namespace ToolNexus.Infrastructure.Tests;

public sealed class DependencyInjectionLifetimeTests
{
    [Fact]
    public void ExecutionPolicyServices_AreRegisteredAsScoped()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder().Build();

        services.AddApplication(configuration);
        services.AddInfrastructure(configuration);

        var registryDescriptor = Assert.Single(services.Where(s => s.ServiceType == typeof(IToolExecutionPolicyRegistry)));
        Assert.Equal(ServiceLifetime.Scoped, registryDescriptor.Lifetime);

        var policyServiceDescriptor = Assert.Single(services.Where(s => s.ServiceType == typeof(IExecutionPolicyService)));
        Assert.Equal(ServiceLifetime.Scoped, policyServiceDescriptor.Lifetime);

        var pipelineDescriptor = Assert.Single(services.Where(s => s.ServiceType == typeof(IToolExecutionPipeline)));
        Assert.Equal(ServiceLifetime.Scoped, pipelineDescriptor.Lifetime);
    }

    [Fact]
    public void PolicyRelatedServices_AreNotRegisteredAsSingleton()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder().Build();

        services.AddApplication(configuration);
        services.AddInfrastructure(configuration);

        var forbiddenSingletons = services
            .Where(descriptor => descriptor.Lifetime == ServiceLifetime.Singleton)
            .Select(descriptor => descriptor.ServiceType)
            .Where(serviceType =>
                serviceType == typeof(IToolExecutionPolicyRegistry) ||
                serviceType == typeof(IExecutionPolicyService) ||
                serviceType == typeof(IToolExecutionPipeline))
            .ToList();

        Assert.Empty(forbiddenSingletons);
    }
}
