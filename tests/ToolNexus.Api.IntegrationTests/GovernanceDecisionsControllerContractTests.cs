using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Controllers.Admin;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class GovernanceDecisionsControllerContractTests
{
    [Fact]
    public void GovernanceDecisionsController_ExposesReadOnlyRoutes()
    {
        var route = typeof(GovernanceDecisionsController)
            .GetCustomAttributes(typeof(RouteAttribute), inherit: false)
            .Cast<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/governance/decisions", route.Template);

        var postMethods = typeof(GovernanceDecisionsController)
            .GetMethods()
            .Where(m => m.GetCustomAttributes(typeof(HttpPostAttribute), false).Any())
            .ToArray();

        Assert.Empty(postMethods);
    }
}
