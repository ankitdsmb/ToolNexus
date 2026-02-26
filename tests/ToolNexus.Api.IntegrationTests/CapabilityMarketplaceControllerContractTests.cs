using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Controllers.Admin;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class CapabilityMarketplaceControllerContractTests
{
    [Fact]
    public void CapabilityMarketplaceController_ExposesReadOnlyRoute()
    {
        var route = typeof(CapabilityMarketplaceController)
            .GetCustomAttributes(typeof(RouteAttribute), false)
            .Cast<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/capabilities/marketplace", route.Template);

        var postMethods = typeof(CapabilityMarketplaceController)
            .GetMethods()
            .Where(m => m.GetCustomAttributes(typeof(HttpPostAttribute), false).Any())
            .ToArray();

        Assert.Empty(postMethods);
    }
}
