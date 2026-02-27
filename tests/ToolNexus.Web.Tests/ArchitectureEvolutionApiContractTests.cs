using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class ArchitectureEvolutionApiContractTests
{
    [Fact]
    public void ArchitectureEvolutionApi_UsesExpectedRoute()
    {
        var route = typeof(ArchitectureEvolutionController)
            .GetCustomAttributes(typeof(RouteAttribute), inherit: true)
            .Cast<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/architecture/evolution", route.Template);

        var dashboard = typeof(ArchitectureEvolutionController).GetMethod("GetDashboard");
        Assert.NotNull(dashboard);

        var httpGet = dashboard!
            .GetCustomAttributes(typeof(HttpGetAttribute), inherit: true)
            .Cast<HttpGetAttribute>()
            .Single();

        Assert.Equal("dashboard", httpGet.Template);
    }
}
