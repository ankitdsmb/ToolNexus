using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Controllers.Admin;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class QualityScoresControllerContractTests
{
    [Fact]
    public void QualityScoresController_ExposesReadOnlyRoute()
    {
        var route = typeof(QualityScoresController)
            .GetCustomAttributes(typeof(RouteAttribute), inherit: false)
            .Cast<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/governance/quality-scores", route.Template);

        var postMethods = typeof(QualityScoresController)
            .GetMethods()
            .Where(m => m.GetCustomAttributes(typeof(HttpPostAttribute), false).Any())
            .ToArray();

        Assert.Empty(postMethods);
    }
}
