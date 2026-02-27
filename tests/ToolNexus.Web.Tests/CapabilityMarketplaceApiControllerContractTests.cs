using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class CapabilityMarketplaceApiControllerContractTests
{
    [Fact]
    public void CapabilityMarketplaceApiController_ExposesAdminRoute()
    {
        var route = typeof(CapabilityMarketplaceController)
            .GetCustomAttributes(typeof(RouteAttribute), inherit: false)
            .OfType<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/capabilities/marketplace", route.Template);
    }
}
