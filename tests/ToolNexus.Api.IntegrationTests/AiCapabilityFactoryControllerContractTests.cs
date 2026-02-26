using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Controllers.Admin;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class AiCapabilityFactoryControllerContractTests
{
    [Fact]
    public void AiCapabilityFactoryController_ExposesGovernedRoutes()
    {
        var route = typeof(AiCapabilityFactoryController)
            .GetCustomAttributes(typeof(RouteAttribute), false)
            .Cast<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/ai-capability-factory", route.Template);

        var writeMethods = typeof(AiCapabilityFactoryController)
            .GetMethods()
            .Where(m => m.GetCustomAttributes(typeof(HttpPostAttribute), false).Any())
            .Select(m => m.Name)
            .ToArray();

        Assert.Contains("CreateDraft", writeMethods);
        Assert.Contains("Validate", writeMethods);
        Assert.Contains("GovernanceDecision", writeMethods);
        Assert.Contains("RunSandbox", writeMethods);
        Assert.Contains("OperatorApprove", writeMethods);
        Assert.Contains("Activate", writeMethods);
    }
}
